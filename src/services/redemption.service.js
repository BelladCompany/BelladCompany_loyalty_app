const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const RealBooksService = require('./realbooks/realbooks.service');
const AuditLogService = require('./audit.service');
const NotificationService = require('./notification.service');

class RedemptionService {
  /**
   * Requests a 6-digit OTP for a customer, rate-limited to 5 requests/hour/customer
   */
  static async requestOtp({ phone, customer_id, tenant_id }) {
    let resolvedCustomerId = customer_id;
    let resolvedPhone = phone;

    // Resolve phone/customer_id if only one was provided
    if (!resolvedCustomerId && resolvedPhone) {
      const phoneRes = await pool.query(
        `SELECT customer_id, phone_number
         FROM customer_phones
         WHERE phone_number = $1 AND tenant_id = $2
         LIMIT 1;`,
        [resolvedPhone, tenant_id]
      );
      if (phoneRes.rows.length === 0) {
        throw { statusCode: 404, message: `No customer found associated with phone number '${resolvedPhone}'` };
      }
      resolvedCustomerId = phoneRes.rows[0].customer_id;
    } else if (resolvedCustomerId && !resolvedPhone) {
      const phoneRes = await pool.query(
        `SELECT phone_number
         FROM customer_phones
         WHERE customer_id = $1 AND tenant_id = $2
         ORDER BY is_verified DESC, phone_id ASC
         LIMIT 1;`,
        [resolvedCustomerId, tenant_id]
      );
      if (phoneRes.rows.length === 0) {
        throw { statusCode: 404, message: `No registered phone number found for customer '${resolvedCustomerId}'` };
      }
      resolvedPhone = phoneRes.rows[0].phone_number;
    }

    // Rate limiting: check requests in the last 1 hour
    const rateLimitRes = await pool.query(
      `SELECT COUNT(*) AS request_count
       FROM otp_requests
       WHERE customer_id = $1 AND tenant_id = $2 AND created_at >= NOW() - INTERVAL '1 hour';`,
      [resolvedCustomerId, tenant_id]
    );

    const requestCount = parseInt(rateLimitRes.rows[0].request_count, 10);
    if (requestCount >= 5) {
      throw {
        statusCode: 429,
        message: 'Rate limit exceeded: A maximum of 5 OTP requests per hour is allowed per customer.',
      };
    }

    // Generate 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 8);

    const insertRes = await pool.query(
      `INSERT INTO otp_requests (customer_id, otp_hash, purpose, expires_at, tenant_id)
       VALUES ($1, $2, 'redemption', NOW() + INTERVAL '5 minutes', $3)
       RETURNING otp_id AS id, customer_id, expires_at, created_at;`,
      [resolvedCustomerId, otpHash, tenant_id]
    );

    const otpRecord = insertRes.rows[0];

    // Dispatch WhatsApp OTP message asynchronously — failures are logged but never block the API response
    const otpSendResult = await NotificationService.sendOtpNotification({
      customer_id: resolvedCustomerId,
      phone: resolvedPhone,
      otp,
      tenant_id,
    });

    // Surface WhatsApp delivery failure so cashier can take action (but OTP still valid in DB)
    const whatsappWarning = otpSendResult.success
      ? null
      : `OTP generated but WhatsApp delivery failed: ${otpSendResult.error || 'Unknown error'}. Please provide the code manually.`;

    return {
      otp_request_id: otpRecord.id,
      customer_id: otpRecord.customer_id,
      phone_number: resolvedPhone,
      expires_at: otpRecord.expires_at,
      expires_in_seconds: 300,
      whatsapp_sent: otpSendResult.success,
      ...(whatsappWarning && { whatsapp_warning: whatsappWarning }),
      // Provide OTP in response in development / test for automated cashier entry
      ...(process.env.NODE_ENV !== 'production' && { debug_otp: otp }),
    };
  }

  /**
   * Validates OTP, lock-in period, points balance, applies 4 points = 1 rupee discount,
   * generates unique redemption code, and records reversing ledger entry.
   */
  static async redeemPoints({
    phone,
    otp,
    points,
    branch_id,
    created_by,
    tenant_id,
    bypass_lock_in = false,
    lock_in_days = 365,
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Resolve phone to customer_id
      const phoneRes = await client.query(
        `SELECT customer_id FROM customer_phones WHERE phone_number = $1 AND tenant_id = $2 LIMIT 1;`,
        [phone, tenant_id]
      );
      if (phoneRes.rows.length === 0) {
        throw { statusCode: 404, message: `No customer found associated with phone number '${phone}'` };
      }
      const customerId = phoneRes.rows[0].customer_id;

      // 2. Validate branch exists
      const branchRes = await client.query(
        `SELECT branch_id AS id, branch_name AS name FROM branches WHERE branch_id = $1 AND tenant_id = $2;`,
        [branch_id, tenant_id]
      );
      if (branchRes.rows.length === 0) {
        throw { statusCode: 404, message: `Branch ID '${branch_id}' not found.` };
      }

      // 3. Find latest active, unused, non-expired OTP for customer
      const otpRes = await client.query(
        `SELECT otp_id AS id, otp_hash, expires_at, used_at
         FROM otp_requests
         WHERE customer_id = $1 AND tenant_id = $2 AND used_at IS NULL AND expires_at > NOW()
         ORDER BY otp_id DESC
         LIMIT 1
         FOR UPDATE;`,
        [customerId, tenant_id]
      );

      if (otpRes.rows.length === 0) {
        throw { statusCode: 400, message: 'No valid active OTP found for this customer or OTP has expired.' };
      }

      const activeOtp = otpRes.rows[0];
      const isOtpValid = await bcrypt.compare(otp, activeOtp.otp_hash);
      if (!isOtpValid) {
        throw { statusCode: 400, message: 'Invalid OTP code provided.' };
      }

      // Mark OTP as used (single-use enforcement)
      await client.query(
        `UPDATE otp_requests SET used_at = NOW() WHERE otp_id = $1;`,
        [activeOtp.id]
      );

      // 4. Check sufficient points balance
      const balanceRes = await client.query(
        `SELECT COALESCE(SUM(points), 0) AS current_balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenant_id]
      );

      const currentBalance = parseInt(balanceRes.rows[0].current_balance, 10);
      if (currentBalance < points) {
        throw {
          statusCode: 400,
          message: `Insufficient points balance. Customer balance is ${currentBalance} points, but ${points} points requested for redemption.`,
        };
      }

      // 5. Check redemption lock-in period (default 365 days since first purchase/earning)
      const firstEarningRes = await client.query(
        `SELECT MIN(created_at) AS first_earning_date
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2 AND points > 0;`,
        [customerId, tenant_id]
      );

      const firstEarningDate = firstEarningRes.rows[0]?.first_earning_date;
      if (!firstEarningDate) {
        throw { statusCode: 400, message: 'Customer has no qualifying purchase/earning records to redeem points against.' };
      }

      const elapsedDays = (Date.now() - new Date(firstEarningDate).getTime()) / (1000 * 60 * 60 * 24);
      if (elapsedDays < lock_in_days && !bypass_lock_in) {
        throw {
          statusCode: 400,
          message: `Redemption lock-in period not met. Points are locked for ${lock_in_days} days from initial purchase (${Math.floor(elapsedDays)} days elapsed).`,
        };
      }

      // 6. Calculate discount at 4 points = 1 rupee (Exact integer math)
      const pointsBig = BigInt(points);
      const discountRupees = Number(pointsBig / 4n);
      const discountPaise = Number((pointsBig * 100n) / 4n);

      // 7. Generate unique redemption code
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
      const redemptionCode = `RDM-${customerId}-${datePart}-${randPart}`;

      // 8. Store redemption record
      const redemptionInsert = await client.query(
        `INSERT INTO redemptions (
           redemption_code, tenant_id, customer_id, points_redeemed, discount_amount, branch_id, cashier_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING redemption_code AS id, redemption_code, customer_id, branch_id, points_redeemed,
                   discount_amount, discount_amount AS discount_amount_rupees, created_at;`,
        [
          redemptionCode,
          tenant_id,
          customerId,
          points,
          discountRupees,
          branch_id,
          created_by || null,
        ]
      );

      const redemption = redemptionInsert.rows[0];

      // 9. Write reversing entry into points_ledger
      const ledgerRes = await client.query(
        `INSERT INTO points_ledger (
           customer_id, branch_id, type, points, source_ref, cashier_id, tenant_id
         )
         VALUES ($1, $2, 'redeem', $3, $4, $5, $6)
         RETURNING entry_id AS id, customer_id, type AS transaction_type, points, source_ref AS reference_id, created_at;`,
        [
          customerId,
          branch_id,
          -points, // Reversing negative points
          `Redemption: ${points} points for ₹${discountRupees} discount (Code: ${redemptionCode})`,
          created_by || null,
          tenant_id,
        ]
      );

      const ledgerEntry = ledgerRes.rows[0];

      // 10. Update customer_tier_snapshot current balance
      const newBalance = currentBalance - points;
      await client.query(
        `UPDATE customer_tier_snapshot
         SET updated_at = NOW()
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenant_id]
      );

      // 11. Audit log: redemption with before/after balance, actor, and timestamp
      await AuditLogService.logEvent({
        action: 'points_redemption',
        entity_type: 'redemption',
        entity_id: redemption.id.toString(),
        actor_user_id: created_by || null,
        before_values: {
          customer_id: customerId,
          current_balance: currentBalance,
        },
        after_values: {
          customer_id: customerId,
          current_balance: newBalance,
          redemption_code: redemptionCode,
        },
        metadata: {
          redemption_code: redemptionCode,
          points_redeemed: points,
          discount_amount_rupees: discountRupees,
          discount_amount_paise: discountPaise,
          branch_id,
          otp_request_id: activeOtp.id,
        },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      // Asynchronously queue RealBooks API sync
      RealBooksService.queueRedemptionSync({
        redemption,
        tenant_id,
      }).catch((syncErr) => {
        console.error('Failed to queue RealBooks sync:', syncErr.message);
      });

      // Non-blocking: send redemption confirmation WhatsApp to customer
      NotificationService.queueRedemptionNotification({
        customer_id: customerId,
        phone,
        pointsRedeemed: points,
        discountRupees,
        remainingBalance: newBalance,
        tenant_id,
      });

      return {
        redemption,
        ledger_entry: ledgerEntry,
        discount: {
          rupees: discountRupees,
          paise: discountPaise,
          rate: '4 points = 1 rupee',
        },
        balance: {
          previous_balance: currentBalance,
          points_redeemed: points,
          remaining_balance: newBalance,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves redemption record details by code
   */
  static async getRedemptionByCode(code, tenantId) {
    const res = await pool.query(
      `SELECT r.redemption_code AS id, r.customer_id, c.customer_name AS customer_name, r.branch_id, b.branch_name AS branch_name,
              r.redemption_code, r.points_redeemed, r.discount_amount AS discount_amount_rupees, r.created_at
       FROM redemptions r
       JOIN customers c ON r.customer_id = c.customer_id AND r.tenant_id = c.tenant_id
       LEFT JOIN branches b ON r.branch_id = b.branch_id
       WHERE r.redemption_code = $1 AND r.tenant_id = $2;`,
      [code, tenantId]
    );

    return res.rows.length > 0 ? res.rows[0] : null;
  }
}

module.exports = RedemptionService;
