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
    if (!explanation || explanation.trim().length < 20) {
      throw { statusCode: 400, message: 'Explanation is mandatory and must be at least 20 characters long.' };
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
   * Lists correction requests for admin queue
   */
  static async listCorrectionRequests({ tenant_id, status = 'pending', user_role, user_branch_id }) {
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

    if (status && status !== 'all') {
      query += ` AND cr.status = $${idx++}`;
      params.push(status);
    }

    // Branch manager scoping: restrict to user's assigned branch
    if (user_role === 'branch_manager' && user_branch_id) {
      query += ` AND cr.branch_id = $${idx++}`;
      params.push(user_branch_id);
    }

    query += ` ORDER BY cr.created_at DESC;`;

    const res = await pool.query(query, params);
    const requests = res.rows;

    // Attach cashier 7-day request frequency & diff preview
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

        let preview = null;
        try {
          preview = await this.previewCorrection({
            points_ledger_reference: req.points_ledger_reference,
            correct_bill_amount: req.correct_bill_amount,
            tenant_id,
          });
        } catch (e) {
          preview = null;
        }

        return {
          ...req,
          cashier_weekly_count: weeklyCount,
          is_unusual_frequency: weeklyCount > 5,
          diff_preview: preview,
        };
      })
    );

    return enriched;
  }

  /**
   * Approves a correction request in ONE atomic DB transaction:
   * 1. Inserts reversal entries for original wrong transaction (type='correction_reversal').
   * 2. Recalculates exact corrected points & inserts corrected entries (type='correction_applied').
   * 3. Updates correction_requests status to 'approved'.
   * 4. Logs complete audit_log entry.
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

      // Branch Manager scoping check
      if (reviewer_role === 'branch_manager' && reviewer_branch_id && reqRecord.branch_id !== reviewer_branch_id) {
        throw { statusCode: 403, message: 'Branch managers can only approve correction requests from their assigned branch.' };
      }

      // 2. Fetch original points_ledger entries
      const origEntries = await this.findOriginalLedgerEntries(reqRecord.points_ledger_reference, tenant_id, client);
      if (origEntries.length === 0) {
        throw { statusCode: 404, message: `Original points_ledger entries not found for reference '${reqRecord.points_ledger_reference}'.` };
      }

      // Fetch customer balance before reversal
      const balRes = await client.query(
        `SELECT COALESCE(SUM(points), 0) AS total_balance FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
        [reqRecord.customer_id, tenant_id]
      );
      const balanceBefore = parseInt(balRes.rows[0].total_balance, 10);

      // 3. Step A: Insert REVERSAL entries (exact opposite sign, type='correction_reversal')
      const insertedReversals = [];
      for (const orig of origEntries) {
        const revPoints = -parseInt(orig.points, 10);
        const revRes = await client.query(
          `INSERT INTO points_ledger (
             customer_id, vehicle_id, branch_id, type, transaction_category, points,
             source_ref, cashier_id, tenant_id, receipt_no, account_ledger_no
           )
           VALUES ($1, $2, $3, 'correction_reversal', $4, $5, $6, $7, $8, $9, $10)
           RETURNING *;`,
          [
            orig.customer_id,
            orig.vehicle_id || null,
            orig.branch_id || reqRecord.branch_id || 1,
            orig.transaction_category || 'redemption',
            revPoints,
            `Reversal of ticket #${request_id}: ${orig.source_ref || 'Original Wrong Transaction'}`,
            reviewer_user_id || null,
            tenant_id,
            orig.receipt_no || null,
            orig.account_ledger_no || null,
          ]
        );
        insertedReversals.push(revRes.rows[0]);
      }

      // 4. Step B: Calculate & Insert CORRECTED entries (type='correction_applied')
      const originalNetPoints = origEntries.reduce((acc, r) => acc + parseInt(r.points, 10), 0);
      const balanceBeforeWrongTx = balanceBefore - originalNetPoints;

      const correctAmt = parseFloat(reqRecord.correct_bill_amount);
      const redeemableRupees = Math.max(0, balanceBeforeWrongTx * POINTS_PER_RUPEE_REDEMPTION);
      const discountApplied = Math.min(redeemableRupees, correctAmt);
      const pointsRedeemed = Math.round(discountApplied / POINTS_PER_RUPEE_REDEMPTION);
      const cashPaid = Math.max(0, correctAmt - discountApplied);
      const newPointsEarned = Math.floor((cashPaid / 100) * POINTS_PER_100_RUPEES_EARNED);

      const mainCategory = origEntries.find((r) => r.type === 'earn')?.transaction_category || 'service';
      const vehId = origEntries[0].vehicle_id || null;
      const branchId = origEntries[0].branch_id || reqRecord.branch_id || 1;
      const receiptNo = origEntries[0].receipt_no || null;
      const ledgerNo = origEntries[0].account_ledger_no || null;

      const insertedCorrected = [];

      if (pointsRedeemed > 0) {
        const cRedeem = await client.query(
          `INSERT INTO points_ledger (
             customer_id, vehicle_id, branch_id, type, transaction_category, points,
             source_ref, cashier_id, tenant_id, receipt_no, account_ledger_no
           )
           VALUES ($1, $2, $3, 'correction_applied', 'redemption', $4, $5, $6, $7, $8, $9)
           RETURNING *;`,
          [
            reqRecord.customer_id,
            vehId,
            branchId,
            -pointsRedeemed,
            `Correction ticket #${request_id}: Applied discount ₹${discountApplied} (Bill: ₹${correctAmt})`,
            reviewer_user_id || null,
            tenant_id,
            receiptNo,
            ledgerNo,
          ]
        );
        insertedCorrected.push(cRedeem.rows[0]);
      }

      if (newPointsEarned > 0) {
        const cEarn = await client.query(
          `INSERT INTO points_ledger (
             customer_id, vehicle_id, branch_id, type, transaction_category, points,
             source_ref, cashier_id, tenant_id, receipt_no, account_ledger_no
           )
           VALUES ($1, $2, $3, 'correction_applied', $4, $5, $6, $7, $8, $9, $10)
           RETURNING *;`,
          [
            reqRecord.customer_id,
            vehId,
            branchId,
            mainCategory,
            newPointsEarned,
            `Correction ticket #${request_id}: Applied points earned on cash paid ₹${cashPaid} (Bill: ₹${correctAmt})`,
            reviewer_user_id || null,
            tenant_id,
            receiptNo,
            ledgerNo,
          ]
        );
        insertedCorrected.push(cEarn.rows[0]);
      }

      // 5. Update correction_requests status
      const updateRes = await client.query(
        `UPDATE correction_requests
         SET status = 'approved',
             reviewed_by = $1,
             reviewed_at = NOW(),
             review_notes = $2
         WHERE id = $3 AND tenant_id = $4
         RETURNING *;`,
        [reviewer_user_id || null, (review_notes || 'Approved').trim(), request_id, tenant_id]
      );

      const approvedRecord = updateRes.rows[0];

      // Calculate final updated balance
      const newBalRes = await client.query(
        `SELECT COALESCE(SUM(points), 0) AS total_balance FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
        [reqRecord.customer_id, tenant_id]
      );
      const finalBalance = parseInt(newBalRes.rows[0].total_balance, 10);

      // 6. Write comprehensive audit_log entry
      await AuditLogService.logEvent({
        action: 'points_correction_approved',
        entity_type: 'correction_request',
        entity_id: request_id.toString(),
        actor_user_id: reviewer_user_id || null,
        before_values: {
          customer_id: reqRecord.customer_id,
          previous_balance: balanceBefore,
          wrong_bill_amount: reqRecord.wrong_bill_amount,
          original_entries: origEntries,
        },
        after_values: {
          customer_id: reqRecord.customer_id,
          correct_bill_amount: reqRecord.correct_bill_amount,
          reversal_entries: insertedReversals,
          corrected_entries: insertedCorrected,
          final_balance: finalBalance,
        },
        metadata: {
          request_id,
          points_ledger_reference: reqRecord.points_ledger_reference,
          cashier_user_id: reqRecord.cashier_user_id,
          explanation: reqRecord.explanation,
          screenshot_file_url: reqRecord.screenshot_file_url,
          review_notes: (review_notes || 'Approved').trim(),
        },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      return {
        success: true,
        message: `Correction request #${request_id} approved successfully.`,
        request: approvedRecord,
        reversals: insertedReversals,
        corrected: insertedCorrected,
        previous_balance: balanceBefore,
        final_balance: finalBalance,
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

      // Branch Manager scoping check
      if (reviewer_role === 'branch_manager' && reviewer_branch_id && reqRecord.branch_id !== reviewer_branch_id) {
        throw { statusCode: 403, message: 'Branch managers can only reject correction requests from their assigned branch.' };
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
