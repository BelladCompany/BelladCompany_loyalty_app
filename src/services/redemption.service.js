const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { POINTS_PER_RUPEE_REDEMPTION, POINTS_PER_100_RUPEES_EARNED } = require('../config/loyalty.config');
const RealBooksService = require('./realbooks/realbooks.service');
const AuditLogService = require('./audit.service');
const NotificationService = require('./notification.service');
const RedemptionEligibilityService = require('./redemption_eligibility.service');

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

    // Check for pending billing correction ticket
    const pendingTicketRes = await pool.query(
      `SELECT id, points_ledger_reference FROM correction_requests
       WHERE customer_id = $1 AND tenant_id = $2 AND status = 'pending' LIMIT 1;`,
      [resolvedCustomerId, tenant_id]
    );

    if (pendingTicketRes.rows.length > 0) {
      const ticket = pendingTicketRes.rows[0];
      throw {
        statusCode: 400,
        message: `Billing Correction Ticket #${ticket.id} is pending Admin review. Redemption & point actions are locked until Admin approves or rejects the request.`,
      };
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
   * Validates OTP, vehicle redemption status (locked/eligible/expired), points balance,
   * applies 4 points = 1 rupee discount, generates unique redemption code,
   * records reversing ledger entry, and resets the vehicle redemption clock.
   */
  static async redeemPoints({
    phone,
    customer_id,
    otp,
    bill_amount,
    points,
    category = 'service',
    receipt_no,
    account_ledger_no,
    branch_id,
    vehicle_id,
    referral_code,
    created_by,
    tenant_id,
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Resolve customer_id
      let customerId = customer_id;
      if (!customerId && phone) {
        const phoneRes = await client.query(
          `SELECT customer_id FROM customer_phones WHERE phone_number = $1 AND tenant_id = $2 LIMIT 1;`,
          [phone, tenant_id]
        );
        if (phoneRes.rows.length === 0) {
          throw { statusCode: 404, message: `No customer found associated with phone number '${phone}'` };
        }
        customerId = phoneRes.rows[0].customer_id;
      }

      if (!customerId) {
        throw { statusCode: 400, message: 'Customer ID or valid Phone number is required for redemption.' };
      }

      // Check for pending billing correction ticket
      const pendingTicketRes = await client.query(
        `SELECT id FROM correction_requests
         WHERE customer_id = $1 AND tenant_id = $2 AND status = 'pending' LIMIT 1;`,
        [customerId, tenant_id]
      );

      if (pendingTicketRes.rows.length > 0) {
        const ticket = pendingTicketRes.rows[0];
        throw {
          statusCode: 400,
          message: `Billing Correction Ticket #${ticket.id} is pending Admin review. Redemption & point actions are locked until Admin approves or rejects the request.`,
        };
      }

      // 2. Validate active OTP for customer
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
      const isOtpValid = await bcrypt.compare(otp.toString(), activeOtp.otp_hash);
      if (!isOtpValid) {
        throw { statusCode: 400, message: 'Invalid OTP code provided.' };
      }

      // Mark OTP as used (single-use enforcement)
      await client.query(
        `UPDATE otp_requests SET used_at = NOW() WHERE otp_id = $1;`,
        [activeOtp.id]
      );

      // 2b. Special Handling for Manual Fallback Referral Tab
      if (category === 'referral') {
        if (!referral_code || !referral_code.trim()) {
          throw { statusCode: 400, message: 'Referral code is required.' };
        }

        const ReferralService = require('./referral.service');
        const refResult = await ReferralService.processReferralBonusForPurchase({
          referral_code: referral_code.trim(),
          buyer_customer_id: customerId,
          vehicle_id,
          receipt_no,
          account_ledger_no,
          branch_id,
          cashier_id: created_by,
          tenant_id,
          externalClient: client,
        });

        await client.query('COMMIT');

        return {
          success: true,
          category: 'referral',
          discount_applied: 0,
          points_redeemed: 0,
          cash_paid: 0,
          new_points_earned: 0,
          points_awarded: refResult.points_awarded,
          slab_label: refResult.slab_label,
          referrer: refResult.referrer,
          buyer: refResult.buyer,
          receipt_no,
          account_ledger_no,
          message: `Referral bonus of ${refResult.points_awarded} points credited to both ${refResult.referrer.name} (${refResult.referrer.customer_id}) and buyer (${customerId}).`,
        };
      }

      // 3. Fetch current points balance for customer
      const balRes = await client.query(
        `SELECT COALESCE(SUM(points), 0) AS total_balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenant_id]
      );
      const currentPointBalance = parseInt(balRes.rows[0].total_balance, 10);

      // 4. Calculate redemption & earning strictly using named constants
      let discount_applied = 0;
      let points_redeemed = 0;
      let cash_paid = 0;
      let new_points_earned = 0;
      const billAmt = bill_amount ? parseFloat(bill_amount) : 0;

      if (billAmt > 0) {
        // a. redeemable_rupees = current_point_balance * POINTS_PER_RUPEE_REDEMPTION
        const redeemable_rupees = currentPointBalance * POINTS_PER_RUPEE_REDEMPTION;
        // b. discount_applied = MIN(redeemable_rupees, bill_amount)
        discount_applied = Math.min(redeemable_rupees, billAmt);
        // c. points_redeemed = discount_applied / POINTS_PER_RUPEE_REDEMPTION
        points_redeemed = Math.round(discount_applied / POINTS_PER_RUPEE_REDEMPTION);
        // d. cash_paid = bill_amount - discount_applied
        cash_paid = billAmt - discount_applied;
        // e. new_points_earned = (cash_paid / 100) * POINTS_PER_100_RUPEES_EARNED
        new_points_earned = Math.floor((cash_paid / 100) * POINTS_PER_100_RUPEES_EARNED);
      } else if (points && parseInt(points, 10) > 0) {
        points_redeemed = parseInt(points, 10);
        if (points_redeemed > currentPointBalance) {
          throw { statusCode: 400, message: `Insufficient point balance. Current balance is ${currentPointBalance} pts.` };
        }
        discount_applied = points_redeemed * POINTS_PER_RUPEE_REDEMPTION;
        cash_paid = 0;
        new_points_earned = 0;
      }

      // 5. Generate unique redemption voucher code & store redemption record
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
      const redemptionCode = `RDM-${customerId}-${datePart}-${randPart}`;

      const redemptionInsert = await client.query(
        `INSERT INTO redemptions (
           redemption_code, tenant_id, customer_id, vehicle_id, points_redeemed,
           discount_amount, branch_id, cashier_id, receipt_no, account_ledger_no
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING redemption_code AS id, redemption_code, customer_id, vehicle_id, branch_id, points_redeemed,
                   discount_amount, receipt_no, account_ledger_no, created_at;`,
        [
          redemptionCode,
          tenant_id,
          customerId,
          vehicle_id || null,
          points_redeemed,
          discount_applied,
          branch_id || null,
          created_by || null,
          receipt_no || null,
          account_ledger_no || null,
        ]
      );
      const redemption = redemptionInsert.rows[0];

      // 6. Write 'redeem' points_ledger row (negative points_redeemed)
      let redeemLedgerEntry = null;
      if (points_redeemed > 0) {
        const rRes = await client.query(
          `INSERT INTO points_ledger (
             customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, cashier_id, tenant_id, receipt_no, account_ledger_no
           )
           VALUES ($1, $2, $3, 'redeem', 'redemption', $4, $5, $6, $7, $8, $9)
           RETURNING entry_id AS id, customer_id, vehicle_id, type AS transaction_type, transaction_category, points, source_ref AS reference_id, created_at;`,
          [
            customerId,
            vehicle_id || null,
            branch_id || null,
            -points_redeemed,
            `Redemption discount of ₹${discount_applied} (Receipt: ${receipt_no || 'N/A'})`,
            created_by || null,
            tenant_id,
            receipt_no || null,
            account_ledger_no || null,
          ]
        );
        redeemLedgerEntry = rRes.rows[0];
      }

      // 7. Write 'earn' points_ledger row (new_points_earned, correct category)
      let normCategory = (category || 'service').toLowerCase();
      if (normCategory === 'accessories') normCategory = 'accessory';
      if (normCategory === 'body parts' || normCategory === 'bodyparts') normCategory = 'bodyshop';
      if (!['service', 'sale', 'accessory', 'bodyshop', 'referral'].includes(normCategory)) {
        normCategory = 'service';
      }

      let earnLedgerEntry = null;
      if (new_points_earned > 0) {
        const eRes = await client.query(
          `INSERT INTO points_ledger (
             customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, cashier_id, tenant_id, receipt_no, account_ledger_no
           )
           VALUES ($1, $2, $3, 'earn', $4, $5, $6, $7, $8, $9, $10)
           RETURNING entry_id AS id, customer_id, vehicle_id, type AS transaction_type, transaction_category, points, source_ref AS reference_id, created_at;`,
          [
            customerId,
            vehicle_id || null,
            branch_id || null,
            normCategory,
            new_points_earned,
            `Earned points on cash paid ₹${cash_paid} (Receipt: ${receipt_no || 'N/A'})`,
            created_by || null,
            tenant_id,
            receipt_no || null,
            account_ledger_no || null,
          ]
        );
        earnLedgerEntry = eRes.rows[0];
      }

      // 8. If vehicle_id provided, reset clock
      if (vehicle_id) {
        await RedemptionEligibilityService.resetClockOnRedemption(vehicle_id, new Date(), tenant_id, client);
      }

      const updated_total_balance = (currentPointBalance - points_redeemed) + new_points_earned;

      await client.query(
        `UPDATE customer_tier_snapshot
         SET updated_at = NOW()
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenant_id]
      );

      // Audit Log
      await AuditLogService.logEvent({
        action: 'points_redemption_and_earn',
        entity_type: 'redemption',
        entity_id: redemption.id.toString(),
        actor_user_id: created_by || null,
        before_values: { customer_id: customerId, previous_balance: currentPointBalance },
        after_values: {
          customer_id: customerId,
          discount_applied,
          points_redeemed,
          cash_paid,
          new_points_earned,
          updated_total_balance,
        },
        metadata: {
          redemption_code: redemptionCode,
          receipt_no,
          account_ledger_no,
          bill_amount: billAmt,
          branch_id,
        },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      // Async RealBooks / Notification queue
      RealBooksService.queueRedemptionSync({ redemption, tenant_id }).catch(() => {});
      if (points_redeemed > 0) {
        NotificationService.queueRedemptionNotification({
          customer_id: customerId,
          phone,
          pointsRedeemed: points_redeemed,
          discountRupees: discount_applied,
          remainingBalance: updated_total_balance,
          tenant_id,
        });
      }

      return {
        discount_applied,
        points_redeemed,
        cash_paid,
        new_points_earned,
        updated_total_balance,
        previous_balance: currentPointBalance,
        redemption_code: redemptionCode,
        receipt_no,
        account_ledger_no,
        redemption,
        redeem_ledger: redeemLedgerEntry,
        earn_ledger: earnLedgerEntry,
        discount: {
          rupees: discount_applied,
        },
        balance: {
          previous_balance: currentPointBalance,
          points_redeemed,
          remaining_balance: updated_total_balance,
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
              r.redemption_code, r.points_redeemed, r.discount_amount, r.discount_amount AS discount_amount_rupees, r.created_at
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
