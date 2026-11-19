const path = require('path');
const { pool } = require('../config/db');
const { POINTS_PER_RUPEE_REDEMPTION, POINTS_PER_100_RUPEES_EARNED } = require('../config/loyalty.config');
const AuditLogService = require('./audit.service');

class CorrectionService {
  /**
   * Looks up original transaction points_ledger entries by reference (receipt_no or source_ref)
   */
  static async findOriginalLedgerEntries(reference, tenantId, client = pool) {
    if (!reference) return [];
    const cleanRef = reference.trim();
    const cleanRefNoHash = cleanRef.replace(/^#/, '');

    const res = await client.query(
      `SELECT entry_id, customer_id, vehicle_id, branch_id, type, transaction_category, points,
              source_ref, receipt_no, account_ledger_no, cashier_id, created_at
       FROM points_ledger
       WHERE tenant_id = $1 AND (
         receipt_no = $2 OR
         account_ledger_no = $2 OR
         source_ref ILIKE ('%' || $2 || '%') OR
         entry_id::text = $2 OR
         entry_id::text = $3 OR
         customer_id = $2 OR
         vehicle_id IN (
           SELECT vehicle_id FROM vehicles
           WHERE tenant_id = $1 AND (
             chassis_no ILIKE ('%' || $2 || '%') OR
             registration_number ILIKE ('%' || $2 || '%') OR
             vin ILIKE ('%' || $2 || '%')
           )
         )
       )
       ORDER BY entry_id DESC;`,
      [tenantId, cleanRef, cleanRefNoHash]
    );

    return res.rows;
  }

  /**
   * Computes preview of reversal and corrected entries before cashier submits or admin approves
   */
  static async previewCorrection({ points_ledger_reference, correct_bill_amount, tenant_id }) {
    if (!points_ledger_reference) {
      throw { statusCode: 400, message: 'points_ledger_reference (receipt_no or reference_id) is required.' };
    }

    const correctAmt = parseFloat(correct_bill_amount || '0');
    if (isNaN(correctAmt) || correctAmt <= 0) {
      throw { statusCode: 400, message: 'Valid positive correct_bill_amount is required.' };
    }

    const origEntries = await this.findOriginalLedgerEntries(points_ledger_reference, tenant_id);
    if (origEntries.length === 0) {
      throw { statusCode: 404, message: `No original points_ledger entries found matching reference '${points_ledger_reference}'.` };
    }

    const customerId = origEntries[0].customer_id;

    // Fetch customer point balance
    const balRes = await pool.query(
      `SELECT COALESCE(SUM(points), 0) AS current_balance
       FROM points_ledger
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenant_id]
    );
    const currentBalance = parseInt(balRes.rows[0].current_balance, 10);

    // Calculate net points originally affected by transaction
    const originalPointsSum = origEntries.reduce((acc, row) => acc + parseInt(row.points, 10), 0);

    // Reversals will exactly flip the sign of original entries
    const reversalEntries = origEntries.map((row) => ({
      type: 'correction_reversal',
      transaction_category: row.transaction_category,
      points: -parseInt(row.points, 10),
      reason: `Reversal of original entry #${row.entry_id} (${row.source_ref || 'N/A'})`,
      receipt_no: row.receipt_no,
      account_ledger_no: row.account_ledger_no,
    }));

    // Balance before wrong transaction
    const balanceBeforeWrong = currentBalance - originalPointsSum;

    // Re-run redemption calculation with correct_bill_amount
    const redeemableRupees = Math.max(0, balanceBeforeWrong * POINTS_PER_RUPEE_REDEMPTION);
    const discountApplied = Math.min(redeemableRupees, correctAmt);
    const pointsRedeemed = Math.round(discountApplied / POINTS_PER_RUPEE_REDEMPTION);
    const cashPaid = Math.max(0, correctAmt - discountApplied);
    const newPointsEarned = Math.floor((cashPaid / 100) * POINTS_PER_100_RUPEES_EARNED);

    const mainCategory = origEntries.find((r) => r.type === 'earn')?.transaction_category || 'service';

    const correctedEntries = [];
    if (pointsRedeemed > 0) {
      correctedEntries.push({
        type: 'correction_applied',
        transaction_category: 'redemption',
        points: -pointsRedeemed,
        reason: `Corrected redemption discount of ₹${discountApplied} (Bill: ₹${correctAmt})`,
      });
    }
    if (newPointsEarned > 0) {
      correctedEntries.push({
        type: 'correction_applied',
        transaction_category: mainCategory,
        points: newPointsEarned,
        reason: `Corrected points earned on cash paid ₹${cashPaid} (Bill: ₹${correctAmt})`,
      });
    }

    const correctedPointsSum = -pointsRedeemed + newPointsEarned;
    const netBalanceChange = -originalPointsSum + correctedPointsSum;
    const expectedFinalBalance = currentBalance + netBalanceChange;

    return {
      customer_id: customerId,
      points_ledger_reference,
      correct_bill_amount: correctAmt,
      original_entries: origEntries,
      reversal_entries: reversalEntries,
      corrected_entries: correctedEntries,
      calculation_breakup: {
        balance_before_transaction: balanceBeforeWrong,
        current_balance: currentBalance,
        discount_applied: discountApplied,
        points_redeemed: pointsRedeemed,
        cash_paid: cashPaid,
        new_points_earned: newPointsEarned,
        original_net_points: originalPointsSum,
        corrected_net_points: correctedPointsSum,
        net_balance_adjustment: netBalanceChange,
        expected_final_balance: expectedFinalBalance,
      },
    };
  }

  /**
   * Cashier raises a new correction request ticket
   */
  static async raiseCorrectionRequest({
    customer_id,
    points_ledger_reference,
    wrong_bill_amount,
    correct_bill_amount,
    explanation,
    screenshot_file_url,
    cashier_user_id,
    branch_id,
    tenant_id,
  }) {
    if (!explanation || !explanation.trim()) {
      throw { statusCode: 400, message: 'Explanation is mandatory.' };
    }

    if (!screenshot_file_url || !screenshot_file_url.trim()) {
      throw { statusCode: 400, message: 'A mandatory proof screenshot upload is required to submit a correction request.' };
    }

    if (!points_ledger_reference || !points_ledger_reference.trim()) {
      throw { statusCode: 400, message: 'Transaction reference (receipt_no or reference_id) is required.' };
    }

    // Verify original entries exist
    const origEntries = await this.findOriginalLedgerEntries(points_ledger_reference, tenant_id);
    if (origEntries.length === 0) {
      throw { statusCode: 404, message: `No original transaction found for reference '${points_ledger_reference}'.` };
    }

    const resolvedCustomerId = customer_id || origEntries[0].customer_id;
    const resolvedBranchId = branch_id || origEntries[0].branch_id || 1;

    // Anti-Fraud Check 1: Ensure receipt belongs to the customer
    if (customer_id && origEntries[0].customer_id && customer_id !== origEntries[0].customer_id) {
      throw {
        statusCode: 400,
        message: `Receipt '${points_ledger_reference}' does not belong to customer ${customer_id}. Cross-customer correction is strictly prohibited.`,
      };
    }

    // Anti-Fraud Check 2: Prevent duplicate pending correction requests for the same receipt
    const dupCheck = await pool.query(
      `SELECT id, status FROM correction_requests
       WHERE tenant_id = $1 AND LOWER(points_ledger_reference) = LOWER($2) AND status = 'pending'
       LIMIT 1;`,
      [tenant_id, points_ledger_reference.trim()]
    );
    if (dupCheck.rows.length > 0) {
      throw {
        statusCode: 400,
        message: `Receipt '${points_ledger_reference.trim()}' already has an active correction request (#${dupCheck.rows[0].id}) under review.`,
      };
    }

    const wrongAmt = parseFloat(wrong_bill_amount || '0');
    const correctAmt = parseFloat(correct_bill_amount || '0');

    if (isNaN(wrongAmt) || wrongAmt <= 0 || isNaN(correctAmt) || correctAmt <= 0) {
      throw { statusCode: 400, message: 'Both wrong_bill_amount and correct_bill_amount must be valid positive numbers.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO correction_requests (
           customer_id, points_ledger_reference, cashier_user_id, branch_id,
           wrong_bill_amount, correct_bill_amount, explanation, screenshot_file_url,
           status, tenant_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
         RETURNING *;`,
        [
          resolvedCustomerId,
          points_ledger_reference.trim(),
          cashier_user_id || null,
          resolvedBranchId,
          wrongAmt,
          correctAmt,
          explanation.trim(),
          screenshot_file_url.trim(),
          tenant_id,
        ]
      );

      const requestRecord = insertRes.rows[0];

      // Calculate cashier 7-day weekly request count for fraud surface tracking
      let weeklyCount = 0;
      if (cashier_user_id) {
        const countRes = await client.query(
          `SELECT COUNT(*) AS total
           FROM correction_requests
           WHERE cashier_user_id = $1 AND tenant_id = $2 AND created_at >= NOW() - INTERVAL '7 days';`,
          [cashier_user_id, tenant_id]
        );
        weeklyCount = parseInt(countRes.rows[0].total, 10);
      }

      await client.query('COMMIT');

      return {
        request: requestRecord,
        weekly_cashier_requests_count: weeklyCount,
        high_frequency_warning: weeklyCount > 5 ? `Warning: Cashier has submitted ${weeklyCount} correction requests in the last 7 days.` : null,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lists correction requests for admin queue and cashier customer views
   */
  static async listCorrectionRequests({ tenant_id, status = 'pending', customer_id, user_role, user_branch_id }) {
    let query = `
      SELECT cr.id, cr.customer_id, c.customer_name, cr.points_ledger_reference,
             cr.cashier_user_id, u.username AS cashier_name,
             cr.branch_id, b.branch_name,
             cr.wrong_bill_amount, cr.correct_bill_amount,
             cr.explanation, cr.screenshot_file_url, cr.status,
             cr.reviewed_by, ru.username AS reviewer_name, cr.reviewed_at, cr.review_notes,
             cr.tenant_id, cr.created_at
      FROM correction_requests cr
      JOIN customers c ON cr.customer_id = c.customer_id AND cr.tenant_id = c.tenant_id
      LEFT JOIN users u ON cr.cashier_user_id = u.user_id
      LEFT JOIN users ru ON cr.reviewed_by = ru.user_id
      LEFT JOIN branches b ON cr.branch_id = b.branch_id
      WHERE cr.tenant_id = $1
    `;
    const params = [tenant_id];
    let idx = 2;

    if (customer_id) {
      query += ` AND cr.customer_id = $${idx++}`;
      params.push(customer_id);
    }

    if (status && status !== 'all') {
      query += ` AND cr.status = $${idx++}`;
      params.push(status);
    }

    query += ` ORDER BY cr.created_at DESC;`;

    const res = await pool.query(query, params);
    const requests = res.rows;

    // Attach cashier 7-day request frequency & anti-fraud audit flags
    const enriched = await Promise.all(
      requests.map(async (req) => {
        let weeklyCount = 0;
        if (req.cashier_user_id) {
          const countRes = await pool.query(
            `SELECT COUNT(*) AS total FROM correction_requests WHERE cashier_user_id = $1 AND tenant_id = $2 AND created_at >= NOW() - INTERVAL '7 days';`,
            [req.cashier_user_id, tenant_id]
          );
          weeklyCount = parseInt(countRes.rows[0].total, 10);
        }

        const wrongNum = parseFloat(req.wrong_bill_amount || 0);
        const correctNum = parseFloat(req.correct_bill_amount || 0);
        const amountDiff = correctNum - wrongNum;
        const percentChange = wrongNum > 0 ? ((amountDiff / wrongNum) * 100).toFixed(1) : '0';
        const isPointsInflation = correctNum > wrongNum;
        const isHighVariance = Math.abs(amountDiff) >= 10000 || (wrongNum > 0 && Math.abs(amountDiff) / wrongNum >= 0.5);

        const fraudFlags = [];
        if (isPointsInflation) fraudFlags.push(`⚠️ Bill amount increase (+₹${amountDiff.toLocaleString('en-IN')})`);
        if (isHighVariance) fraudFlags.push(`🚨 High variance (${percentChange}%)`);
        if (weeklyCount > 3) fraudFlags.push(`🚨 Frequent cashier tickets (${weeklyCount} this week)`);

        return {
          ...req,
          cashier_weekly_count: weeklyCount,
          is_unusual_frequency: weeklyCount > 3,
          amount_diff: amountDiff,
          percent_change: percentChange,
          is_points_inflation: isPointsInflation,
          is_high_variance: isHighVariance,
          fraud_flags: fraudFlags,
          risk_level: isHighVariance || isPointsInflation || weeklyCount > 3 ? 'HIGH' : 'LOW',
        };
      })
    );

    return enriched;
  }

  /**
   * Approves a correction request:
   * Updates status to 'approved' and records reviewer details & audit log.
   * Strictly NO points_ledger insertions (cashier will enter new receipt separately if required).
   */
  static async approveCorrectionRequest({
    request_id,
    reviewer_user_id,
    reviewer_role,
    reviewer_branch_id,
    review_notes,
    tenant_id,
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock correction request row
      const reqRes = await client.query(
        `SELECT * FROM correction_requests WHERE id = $1 AND tenant_id = $2 FOR UPDATE;`,
        [request_id, tenant_id]
      );

      if (reqRes.rows.length === 0) {
        throw { statusCode: 404, message: `Correction request #${request_id} not found.` };
      }

      const reqRecord = reqRes.rows[0];

      if (reqRecord.status !== 'pending') {
        throw { statusCode: 400, message: `Correction request #${request_id} is already ${reqRecord.status}.` };
      }

      // 2. Update correction_requests status to 'approved'
      // Strictly NO duplicate points_ledger insertions!
      const updateRes = await client.query(
        `UPDATE correction_requests
         SET status = 'approved',
             reviewed_by = $1,
             reviewed_at = NOW(),
             review_notes = $2
         WHERE id = $3 AND tenant_id = $4
         RETURNING *;`,
        [reviewer_user_id || null, (review_notes || 'Approved by Manager').trim(), request_id, tenant_id]
      );

      const approvedRecord = updateRes.rows[0];

      // 3. Write comprehensive audit_log entry
      await AuditLogService.logEvent({
        action: 'points_correction_approved',
        entity_type: 'correction_request',
        entity_id: request_id.toString(),
        actor_user_id: reviewer_user_id || null,
        before_values: {
          customer_id: reqRecord.customer_id,
          receipt_no: reqRecord.points_ledger_reference,
          wrong_bill_amount: reqRecord.wrong_bill_amount,
          correct_bill_amount: reqRecord.correct_bill_amount,
          status: 'pending',
        },
        after_values: {
          customer_id: reqRecord.customer_id,
          receipt_no: reqRecord.points_ledger_reference,
          status: 'approved',
          reviewed_by: reviewer_user_id,
          review_notes: approvedRecord.review_notes,
        },
        metadata: {
          request_id,
          points_ledger_reference: reqRecord.points_ledger_reference,
          cashier_user_id: reqRecord.cashier_user_id,
          explanation: reqRecord.explanation,
          screenshot_file_url: reqRecord.screenshot_file_url,
          review_notes: approvedRecord.review_notes,
        },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      return {
        success: true,
        message: `Correction for receipt #${reqRecord.points_ledger_reference} approved successfully. (Status updated to Approved; no duplicate transaction entered).`,
        request: approvedRecord,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Rejects a correction request with mandatory review notes
   */
  static async rejectCorrectionRequest({
    request_id,
    reviewer_user_id,
    reviewer_role,
    reviewer_branch_id,
    review_notes,
    tenant_id,
  }) {
    if (!review_notes || review_notes.trim().length < 5) {
      throw { statusCode: 400, message: 'Mandatory review notes (at least 5 characters) must be provided when rejecting a correction request.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query(
        `SELECT * FROM correction_requests WHERE id = $1 AND tenant_id = $2 FOR UPDATE;`,
        [request_id, tenant_id]
      );

      if (reqRes.rows.length === 0) {
        throw { statusCode: 404, message: `Correction request #${request_id} not found.` };
      }

      const reqRecord = reqRes.rows[0];

      if (reqRecord.status !== 'pending') {
        throw { statusCode: 400, message: `Correction request #${request_id} is already ${reqRecord.status}.` };
      }

      const updateRes = await client.query(
        `UPDATE correction_requests
         SET status = 'rejected',
             reviewed_by = $1,
             reviewed_at = NOW(),
             review_notes = $2
         WHERE id = $3 AND tenant_id = $4
         RETURNING *;`,
        [reviewer_user_id || null, review_notes.trim(), request_id, tenant_id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: `Correction request #${request_id} rejected.`,
        request: updateRes.rows[0],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Verifies proof filename belongs to a valid correction request for user's tenant
   */
  static async verifyProofFileAccess(filename, tenantId) {
    if (!filename || typeof filename !== 'string') return false;
    const cleanFilename = path.basename(filename);

    const res = await pool.query(
      `SELECT id FROM correction_requests
       WHERE tenant_id = $1 AND screenshot_file_url LIKE ('%' || $2)
       LIMIT 1;`,
      [tenantId, cleanFilename]
    );

    return res.rows.length > 0;
  }
}

module.exports = CorrectionService;
