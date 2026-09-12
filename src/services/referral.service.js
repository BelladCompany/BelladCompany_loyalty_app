const { pool } = require('../config/db');
const NotificationService = require('./notification.service');
const AuditLogService = require('./audit.service');
const cryptoUtil = require('../utils/crypto.util');
const bcrypt = require('bcryptjs');

class ReferralService {
  /**
   * Process Referral Bonus for a Vehicle Purchase (both Automatic AppSheet pull and Manual fallback paths)
   * 
   * Server-side Enforcements:
   * 1. Vehicle purchase context required (vehicle_id & ex_showroom_price > 0).
   * 2. Self-referral forbidden (referrer_customer_id !== buyer_customer_id).
   * 3. Idempotency check: Reject if referral bonus already credited for this vehicle.
   * 4. Slab lookup: Determine 4W/2W slab points from ex_showroom_price.
   * 5. Single DB transaction: Credit BOTH referrer and buyer with points_awarded (category='referral').
   */
  static async processReferralBonusForPurchase({
    referral_code,
    buyer_customer_id,
    vehicle_id,
    receipt_no,
    account_ledger_no,
    branch_id,
    cashier_id,
    tenant_id,
    externalClient = null,
  }) {
    const client = externalClient || (await pool.connect());
    const isLocalTx = !externalClient;

    try {
      if (isLocalTx) await client.query('BEGIN');

      // 1. Resolve referrer customer
      const CustomerService = require('./customer.service');
      const referrer = await CustomerService.getCustomerByReferralCode(referral_code, tenant_id);
      const referrerCustomerId = referrer.customer_id;

      // 2. Validate not self-referral
      if (referrerCustomerId === buyer_customer_id) {
        throw { statusCode: 400, message: 'Self-referral is not allowed. Referrer and referred buyer must be different customers.' };
      }

      // 3. Validate vehicle purchase context
      if (!vehicle_id) {
        throw { statusCode: 400, message: 'Referral bonus can only be applied to a vehicle purchase.' };
      }

      const vehRes = await client.query(
        `SELECT vehicle_id, customer_id, model, fuel_type, vehicle_type, ex_showroom_price
         FROM vehicles
         WHERE vehicle_id = $1 AND tenant_id = $2;`,
        [vehicle_id, tenant_id]
      );

      if (vehRes.rows.length === 0) {
        throw { statusCode: 404, message: `Vehicle ID '${vehicle_id}' not found.` };
      }

      const vehicle = vehRes.rows[0];
      const exShowroomPaise = Number(vehicle.ex_showroom_price || 0);

      if (!exShowroomPaise || exShowroomPaise <= 0) {
        throw { statusCode: 400, message: 'Referral bonus can only be applied to a vehicle purchase with a valid ex-showroom price.' };
      }

      // 4. Idempotency Check: Verify if referral bonus has ALREADY been applied for this vehicle
      const idempRes = await client.query(
        `SELECT entry_id FROM points_ledger
         WHERE vehicle_id = $1 AND transaction_category = 'referral' AND tenant_id = $2
         LIMIT 1;`,
        [vehicle_id, tenant_id]
      );

      if (idempRes.rows.length > 0) {
        throw { statusCode: 409, message: 'Referral bonus has already been credited for this vehicle purchase.' };
      }

      // 5. Slab Lookup
      const category = (vehicle.vehicle_type === '2W' || (vehicle.fuel_type && vehicle.fuel_type.toUpperCase().includes('2W'))) ? '2W' : '4W';

      const slabRes = await client.query(
        `SELECT points_awarded, price_range_label, base_amount_paise
         FROM referral_slabs
         WHERE tenant_id = $1 AND category = $2
           AND price_min_paise <= $3
           AND (price_max_paise IS NULL OR price_max_paise >= $3)
         LIMIT 1;`,
        [tenant_id, category, exShowroomPaise]
      );

      let pointsAwarded = 2500; // Default slab fallback
      let slabLabel = 'Standard Vehicle Referral';

      if (slabRes.rows.length > 0) {
        pointsAwarded = parseInt(slabRes.rows[0].points_awarded, 10);
        slabLabel = slabRes.rows[0].price_range_label;
      }

      // 6. Insert record into referrals table
      const refInsert = await client.query(
        `INSERT INTO referrals (referrer_customer_id, referred_customer_id, status, points_credited, tenant_id)
         VALUES ($1, $2, 'approved', $3, $4)
         RETURNING referral_id AS id, referrer_customer_id, referred_customer_id, points_credited, status;`,
        [referrerCustomerId, buyer_customer_id, pointsAwarded, tenant_id]
      );
      const referralRecord = refInsert.rows[0];

      // 7. Credit Referrer in points_ledger
      const referrerLedger = await client.query(
        `INSERT INTO points_ledger (
           customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, cashier_id, tenant_id, receipt_no, account_ledger_no
         )
         VALUES ($1, $2, $3, 'earn', 'referral', $4, $5, $6, $7, $8, $9)
         RETURNING entry_id AS id, customer_id, points, created_at;`,
        [
          referrerCustomerId,
          vehicle_id,
          branch_id || null,
          pointsAwarded,
          `Referral Bonus (Referrer): Awarded ${pointsAwarded} pts for referring ${buyer_customer_id} (${slabLabel})`,
          cashier_id || null,
          tenant_id,
          receipt_no || null,
          account_ledger_no || null,
        ]
      );

      // 8. Credit Buyer in points_ledger
      const buyerLedger = await client.query(
        `INSERT INTO points_ledger (
           customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, cashier_id, tenant_id, receipt_no, account_ledger_no
         )
         VALUES ($1, $2, $3, 'earn', 'referral', $4, $5, $6, $7, $8, $9)
         RETURNING entry_id AS id, customer_id, points, created_at;`,
        [
          buyer_customer_id,
          vehicle_id,
          branch_id || null,
          pointsAwarded,
          `Referral Bonus (Buyer): Awarded ${pointsAwarded} pts for purchase referred by ${referrer.customer_name} (${slabLabel})`,
          cashier_id || null,
          tenant_id,
          receipt_no || null,
          account_ledger_no || null,
        ]
      );

      if (isLocalTx) await client.query('COMMIT');

      return {
        success: true,
        points_awarded: pointsAwarded,
        slab_label: slabLabel,
        referrer: {
          customer_id: referrerCustomerId,
          name: referrer.customer_name,
        },
        buyer: {
          customer_id: buyer_customer_id,
        },
        referral: referralRecord,
        referrer_ledger: referrerLedger.rows[0],
        buyer_ledger: buyerLedger.rows[0],
      };
    } catch (err) {
      if (isLocalTx) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (isLocalTx) client.release();
    }
  }

  /**
   * Registers a new referral record in pending status with 0 points
   */
  static async registerReferral({ referrer_customer_id, referred_customer_id, tenant_id }) {
    if (referrer_customer_id === referred_customer_id) {
      throw { statusCode: 400, message: 'Self-referrals are not permitted. Referrer and referred must be different customers.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify referrer exists
      const referrerCheck = await client.query(
        `SELECT customer_id, customer_name AS name FROM customers WHERE customer_id = $1 AND tenant_id = $2;`,
        [referrer_customer_id, tenant_id]
      );
      if (referrerCheck.rows.length === 0) {
        throw { statusCode: 404, message: `Referrer customer '${referrer_customer_id}' not found.` };
      }

      // Verify referred exists
      const referredCheck = await client.query(
        `SELECT customer_id, customer_name AS name FROM customers WHERE customer_id = $1 AND tenant_id = $2;`,
        [referred_customer_id, tenant_id]
      );
      if (referredCheck.rows.length === 0) {
        throw { statusCode: 404, message: `Referred customer '${referred_customer_id}' not found.` };
      }

      // Insert referral record
      const res = await client.query(
        `INSERT INTO referrals (referrer_customer_id, referred_customer_id, status, points_credited, tenant_id)
         VALUES ($1, $2, 'pending', 0, $3)
         RETURNING referral_id AS id, referral_id, referrer_customer_id, referred_customer_id,
                   status, points_credited AS points_awarded, created_at;`,
        [referrer_customer_id, referred_customer_id, tenant_id]
      );

      await client.query('COMMIT');

      return {
        ...res.rows[0],
        referrer_name: referrerCheck.rows[0].name,
        referred_name: referredCheck.rows[0].name,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Auto-calculates suggested referral points from referral_slabs when a referred customer purchases a vehicle.
   * Pre-fills suggested_points, points_credited, and reason on pending referral record without changing status from 'pending'.
   */
  static async autoCalculateReferralPoints({ referred_customer_id, ex_showroom_price_paise, vehicle_id, tenant_id, client = pool }) {
    if (!referred_customer_id || !ex_showroom_price_paise) return null;

    try {
      // 1. Determine vehicle category ('2W' or '4W')
      let category = '4W';
      if (vehicle_id) {
        const vehId = parseInt(vehicle_id, 10);
        if (!isNaN(vehId)) {
          const vehRes = await client.query(
            `SELECT vehicle_type FROM vehicles WHERE vehicle_id = $1 AND tenant_id = $2;`,
            [vehId, tenant_id]
          );
          if (vehRes.rows.length > 0 && vehRes.rows[0].vehicle_type === '2W') {
            category = '2W';
          }
        }
      }

      // 2. Lookup matching slab in referral_slabs
      const pricePaiseStr = String(ex_showroom_price_paise);
      const slabRes = await client.query(
        `SELECT price_range_label, points_awarded
         FROM referral_slabs
         WHERE category = $1::text
           AND tenant_id = $2::text
           AND price_min_paise <= ($3::text)::bigint
           AND (price_max_paise IS NULL OR price_max_paise >= ($4::text)::bigint)
         ORDER BY price_min_paise DESC
         LIMIT 1;`,
        [category, tenant_id, pricePaiseStr, pricePaiseStr]
      );

      if (slabRes.rows.length === 0) return null;

      const matchedSlab = slabRes.rows[0];
      const autoReason = `Auto-calculated from referral slab: ${matchedSlab.price_range_label}`;

      // 3. Update pending referral record with suggested points and reason (status stays 'pending')
      const ptsVal = Number(matchedSlab.points_awarded);
      const updateRes = await client.query(
        `UPDATE referrals
         SET suggested_points = CAST($1 AS bigint),
             points_credited = CAST($2 AS integer),
             reason = $3
         WHERE referred_customer_id = $4 AND status = 'pending' AND tenant_id = $5
         RETURNING *;`,
        [ptsVal, ptsVal, autoReason, referred_customer_id, tenant_id]
      );

      return updateRes.rows[0] || null;
    } catch (err) {
      console.error('❌ autoCalculateReferralPoints Error:', err);
      throw err;
    }
  }

  /**
   * Approves a referral manually with specified points, mandatory reason, and authorized approver validation.
   * Asynchronously triggers non-blocking WhatsApp notification.
   */
  static async approveReferral({ referral_id, points, reason, current_user_id, approver_id, tenant_id }) {
    if (!reason || reason.trim().length === 0) {
      throw { statusCode: 400, message: 'A mandatory reason must be provided when approving referral points.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch referral with row lock
      const refRes = await client.query(
        `SELECT referral_id AS id, referral_id, referrer_customer_id, referred_customer_id, status, COALESCE(suggested_points, 0) AS suggested_points
         FROM referrals
         WHERE referral_id = $1 AND tenant_id = $2
         FOR UPDATE;`,
        [referral_id, tenant_id]
      );

      if (refRes.rows.length === 0) {
        throw { statusCode: 404, message: `Referral record '${referral_id}' not found.` };
      }

      const referral = refRes.rows[0];

      if (referral.status !== 'pending') {
        throw { statusCode: 400, message: `Referral '${referral_id}' is already ${referral.status} and cannot be modified.` };
      }

      // Fetch referrer balance snapshot before referral approval
      const referrerBeforeAgg = await client.query(
        `SELECT 
     COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points,
     COALESCE(SUM(points), 0) AS current_balance
   FROM points_ledger
   WHERE customer_id = $1 AND tenant_id = $2;`,
        [referral.referrer_customer_id, tenant_id]
      );
      const balanceBefore = parseInt(referrerBeforeAgg.rows[0].current_balance, 10);
      const lifetimeBefore = parseInt(referrerBeforeAgg.rows[0].lifetime_points, 10);

      // 2. Validate authorized approver identity
      let approverQuery = `SELECT approver_id AS id, approver_id, name FROM referral_approvers WHERE tenant_id = $1 AND active = TRUE`;
      const approverParams = [tenant_id];

      if (approver_id) {
        approverQuery += ` AND approver_id = $2;`;
        approverParams.push(approver_id);
      } else {
        approverQuery += ` ORDER BY approver_id ASC LIMIT 1;`;
      }

      const approverRes = await client.query(approverQuery, approverParams);

      if (approverRes.rows.length === 0) {
        throw {
          statusCode: 403,
          message: 'Forbidden: No active authorized referral approver found.',
        };
      }

      const approver = approverRes.rows[0];

      // 3. Update referral record
      const updateRefRes = await client.query(
        `UPDATE referrals
         SET status = 'approved',
             points_credited = $1,
             reason = $2,
             approved_by = $3,
             approved_at = NOW()
         WHERE referral_id = $4 AND tenant_id = $5
         RETURNING referral_id AS id, referral_id, referrer_customer_id, referred_customer_id, status,
                   points_credited AS points_awarded, COALESCE(suggested_points, 0) AS suggested_points,
                   reason AS approval_reason, approved_by, approved_at;`,
        [points, reason.trim(), approver.id, referral_id, tenant_id]
      );

      const approvedReferral = updateRefRes.rows[0];

      // 4. Write immutable record to points_ledger (type: earn_referral)
      const ledgerRes = await client.query(
        `INSERT INTO points_ledger (
           customer_id, type, transaction_category, points, source_ref, cashier_id, tenant_id
         )
         VALUES ($1, 'earn_referral', 'sale', $2, $3, $4, $5)
         RETURNING entry_id AS id, customer_id, type AS transaction_type,
                   points, source_ref AS reference_id, created_at;`,
        [
          referral.referrer_customer_id,
          points,
          `REF-${referral_id} | ${reason.trim()}`,
          current_user_id,
          tenant_id,
        ]
      );

      const ledgerEntry = ledgerRes.rows[0];

      // 5. Recalculate lifetime points and update tier snapshot for referrer
      const aggRes = await client.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points,
           COALESCE(SUM(points), 0) AS current_balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [referral.referrer_customer_id, tenant_id]
      );

      const lifetimePoints = parseInt(aggRes.rows[0].lifetime_points, 10);
      const currentBalance = parseInt(aggRes.rows[0].current_balance, 10);

      const tierRes = await client.query(
        `SELECT tier_rule_id AS id, tier_name
         FROM tier_rules
         WHERE tenant_id = $1 AND min_lifetime_points <= $2
         ORDER BY min_lifetime_points DESC, tier_rule_id DESC
         LIMIT 1;`,
        [tenant_id, lifetimePoints]
      );

      const tier = tierRes.rows.length > 0 ? tierRes.rows[0] : { id: null, tier_name: 'Standard' };

      const snapshotRes = await client.query(
        `INSERT INTO customer_tier_snapshot (
     customer_id, current_tier, lifetime_points, tenant_id, updated_at
   )
   VALUES ($1, $2, $3, $4, NOW())
   ON CONFLICT (customer_id) DO UPDATE
   SET current_tier = EXCLUDED.current_tier,
       lifetime_points = EXCLUDED.lifetime_points,
       updated_at = NOW()
   RETURNING customer_id, current_tier AS tier_name, lifetime_points, updated_at;`,
        [referral.referrer_customer_id, tier.tier_name, lifetimePoints, tenant_id]
      );

      // Audit Log event for manual referral points approval (logging suggested vs final awarded value)
      const suggestedVal = parseInt(referral.suggested_points || 0, 10);
      const overrideOccurred = suggestedVal > 0 && suggestedVal !== parseInt(points, 10);

      await AuditLogService.logEvent({
        action: 'points_earn_referral',
        entity_type: 'customer',
        entity_id: referral.referrer_customer_id,
        actor_user_id: current_user_id || null,
        before_values: { current_balance: balanceBefore, lifetime_points: lifetimeBefore },
        after_values: { current_balance: currentBalance, lifetime_points: lifetimePoints },
        metadata: {
          referral_id,
          referred_customer_id: referral.referred_customer_id,
          suggested_points: suggestedVal,
          points_awarded: points,
          override_occurred: overrideOccurred,
          approval_reason: reason.trim(),
          approver_id: approver.id,
          approver_name: approver.name,
        },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      // 6. Queue non-blocking WhatsApp notification (does not block HTTP response)
      NotificationService.queuePointsEarnedNotification({
        customer_id: referral.referrer_customer_id,
        points,
        transaction_type: 'referral',
        tenant_id,
      });

      return {
        referral: {
          ...approvedReferral,
          approved_by_name: approver.name,
        },
        ledger_entry: ledgerEntry,
        referrer_tier_snapshot: snapshotRes.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lists referrals with optional filtering
   */
  static async listReferrals({ tenant_id, status, customer_id, limit = 50, offset = 0 }) {
    let query = `
      SELECT r.referral_id AS id, r.referral_id,
             r.referrer_customer_id, c1.customer_name AS referrer_name,
             r.referred_customer_id, c2.customer_name AS referred_name,
             r.status, r.points_credited AS points_awarded, COALESCE(r.suggested_points, 0) AS suggested_points,
             r.reason AS approval_reason,
             r.approved_by, ra.name AS approver_name,
             r.approved_at, r.created_at
      FROM referrals r
      JOIN customers c1 ON r.referrer_customer_id = c1.customer_id AND r.tenant_id = c1.tenant_id
      JOIN customers c2 ON r.referred_customer_id = c2.customer_id AND r.tenant_id = c2.tenant_id
      LEFT JOIN referral_approvers ra ON r.approved_by = ra.approver_id
      WHERE r.tenant_id = $1
    `;
    const params = [tenant_id];
    let idx = 2;

    if (status) {
      query += ` AND r.status = $${idx++}`;
      params.push(status);
    }
    if (customer_id) {
      query += ` AND (r.referrer_customer_id = $${idx} OR r.referred_customer_id = $${idx})`;
      params.push(customer_id);
      idx++;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${idx++} OFFSET $${idx++};`;
    params.push(limit, offset);

    const res = await pool.query(query, params);
    return res.rows;
  }

  /**
   * Lists authorized referral approvers
   */
  static async listApprovers(tenant_id) {
    const res = await pool.query(
      `SELECT approver_id AS id, approver_id, name, active AS is_active, created_at
       FROM referral_approvers
       WHERE tenant_id = $1
       ORDER BY approver_id ASC;`,
      [tenant_id]
    );
    return res.rows;
  }

  /**
   * Request OTP for Public Lead Generation Form
   */
  static async requestPublicLeadOtp({ referrer_code, lead_name, lead_phone, lead_aadhaar, tenant_id }) {
    // 1. Resolve referrer customer
    const CustomerService = require('./customer.service');
    const referrer = await CustomerService.getCustomerByReferralCode(referrer_code, tenant_id);
    if (!referrer) {
      throw { statusCode: 404, message: `Referrer customer code '${referrer_code}' not found.` };
    }

    // 2. Compute Aadhaar hash
    const aadhaarHash = cryptoUtil.hashIdentifier(lead_aadhaar);

    // 3. Reject if Aadhaar already exists as a registered customer in system
    const existingCustRes = await pool.query(
      `SELECT customer_id FROM customers WHERE aadhaar_hash = $1 AND tenant_id = $2 LIMIT 1;`,
      [aadhaarHash, tenant_id]
    );
    if (existingCustRes.rows.length > 0) {
      throw {
        statusCode: 400,
        message: "You are already a registered member in our loyalty program. Referral lead registration is only for new customers.",
      };
    }

    // 4. Reject if Aadhaar already has an active referral lead
    const existingLeadRes = await pool.query(
      `SELECT id, generated_code, status FROM referral_leads WHERE lead_aadhaar_hash = $1 AND tenant_id = $2 AND status != 'expired' LIMIT 1;`,
      [aadhaarHash, tenant_id]
    );
    if (existingLeadRes.rows.length > 0) {
      throw {
        statusCode: 400,
        message: "A referral code has already been generated for this Aadhaar number.",
      };
    }

    // 5. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 8);

    await pool.query(
      `INSERT INTO otp_requests (customer_id, otp_hash, purpose, expires_at, tenant_id)
       VALUES ($1, $2, 'referral_lead', NOW() + INTERVAL '5 minutes', $3);`,
      [referrer.customer_id, otpHash, tenant_id]
    );

    // Send WhatsApp OTP
    const otpSendResult = await NotificationService.sendOtpNotification({
      customer_id: referrer.customer_id,
      phone: lead_phone,
      otp,
      tenant_id,
    });

    return {
      success: true,
      message: `OTP sent to ${lead_phone}.`,
      lead_phone,
      referrer_name: referrer.customer_name,
      expires_in_seconds: 300,
      whatsapp_sent: otpSendResult.success,
      ...(process.env.NODE_ENV !== 'production' && { debug_otp: otp }),
    };
  }

  /**
   * Verify OTP and Generate 8-char Lead Code
   */
  static async verifyPublicLeadOtpAndGenerateCode({ referrer_code, lead_name, lead_phone, lead_aadhaar, otp, tenant_id }) {
    // 1. Resolve referrer customer
    const CustomerService = require('./customer.service');
    const referrer = await CustomerService.getCustomerByReferralCode(referrer_code, tenant_id);
    if (!referrer) {
      throw { statusCode: 404, message: `Referrer customer code '${referrer_code}' not found.` };
    }

    // 2. Compute Aadhaar Hash & Encrypt Last 4
    const aadhaarHash = cryptoUtil.hashIdentifier(lead_aadhaar);
    const aadhaarLast4Enc = cryptoUtil.encrypt(lead_aadhaar.slice(-4));

    // 3. Verify OTP
    const otpRes = await pool.query(
      `SELECT otp_id, otp_hash FROM otp_requests
       WHERE customer_id = $1 AND purpose = 'referral_lead' AND expires_at > NOW() AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1;`,
      [referrer.customer_id]
    );

    if (otpRes.rows.length === 0) {
      throw { statusCode: 400, message: 'Invalid or expired OTP. Please request a new OTP.' };
    }

    const otpRecord = otpRes.rows[0];
    const isMatch = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isMatch) {
      throw { statusCode: 400, message: 'Invalid OTP code. Please check and try again.' };
    }

    // Mark OTP used
    await pool.query(`UPDATE otp_requests SET used_at = NOW() WHERE otp_id = $1;`, [otpRecord.otp_id]);

    // 4. Generate unique 8-character code: e.g. RF8K92X1
    const crypto = require('crypto');
    let generatedCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 uppercase chars
      generatedCode = `RF${randomChars.slice(0, 6)}`;
      const checkCodeRes = await pool.query(
        `SELECT id FROM referral_leads WHERE generated_code = $1 LIMIT 1;`,
        [generatedCode]
      );
      if (checkCodeRes.rows.length === 0) isUnique = true;
    }

    // 5. Create referral_leads record
    const insertRes = await pool.query(
      `INSERT INTO referral_leads (
         referrer_customer_id, lead_name, lead_phone, lead_aadhaar_hash, lead_aadhaar_last4_enc,
         generated_code, phone_verified, status, tenant_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, true, 'pending', $7)
       RETURNING id, generated_code, status, created_at;`,
      [referrer.customer_id, lead_name, lead_phone, aadhaarHash, aadhaarLast4Enc, generatedCode, tenant_id]
    );

    const leadRecord = insertRes.rows[0];

    // Dispatch notification to lead's phone with the generated code
    try {
      const { getWhatsAppProvider } = require('./whatsapp/whatsapp.provider');
      const provider = getWhatsAppProvider();
      if (provider && provider.sendOtpTemplate) {
        await provider.sendOtpTemplate({
          toPhone: lead_phone,
          templateName: 'referral_lead_code',
          code: generatedCode,
          expiryMinutes: 1440,
        }).catch(() => {});
      }
    } catch (msgErr) {
      // Non-blocking notification dispatch
    }

    return {
      success: true,
      lead_id: leadRecord.id,
      generated_code: generatedCode,
      lead_name,
      lead_phone,
      referrer_name: referrer.customer_name,
      status: leadRecord.status,
    };
  }

  /**
   * Process Lead at Vehicle Purchase (Cross-checks Aadhaar, sets status to 'used' or 'mismatched')
   */
  static async processLeadAtPurchase({ generated_code, buyer_aadhaar, sale_reference, tenant_id }) {
    const leadRes = await pool.query(
      `SELECT * FROM referral_leads WHERE generated_code = $1 AND tenant_id = $2 LIMIT 1;`,
      [generated_code, tenant_id]
    );

    if (leadRes.rows.length === 0) return null;

    const lead = leadRes.rows[0];
    const buyerAadhaarHash = cryptoUtil.hashIdentifier(buyer_aadhaar);

    if (buyerAadhaarHash !== lead.lead_aadhaar_hash) {
      // Aadhaar Mismatch!
      await pool.query(
        `UPDATE referral_leads
         SET status = 'mismatched', matched_sale_reference = $1, flagged_reason = 'Aadhaar mismatch between lead registrant and actual vehicle buyer', updated_at = NOW()
         WHERE id = $2;`,
        [sale_reference, lead.id]
      );
      await AuditLogService.logAction({
        user_id: 'SYSTEM_PULL',
        action: 'REFERRAL_LEAD_MISMATCH',
        details: { lead_id: lead.id, generated_code, sale_reference },
        tenant_id,
      });
      return { lead_id: lead.id, status: 'mismatched', matched: false };
    }

    // Matching Aadhaar! Set status = 'used', but do NOT credit points yet (waits for RC completion)
    await pool.query(
      `UPDATE referral_leads
       SET status = 'used', matched_sale_reference = $1, updated_at = NOW()
       WHERE id = $2;`,
      [sale_reference, lead.id]
    );

    return { lead_id: lead.id, status: 'used', matched: true };
  }

  /**
   * Confirm RC Completion and Credit Referral Points
   */
  static async confirmRcCompletionAndCredit({ lead_id, admin_user_id = 'ADMIN', tenant_id }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const leadRes = await client.query(
        `SELECT * FROM referral_leads WHERE id = $1 AND tenant_id = $2 FOR UPDATE;`,
        [lead_id, tenant_id]
      );

      if (leadRes.rows.length === 0) {
        throw { statusCode: 404, message: `Referral lead #${lead_id} not found.` };
      }

      const lead = leadRes.rows[0];
      if (lead.status === 'rc_completed') {
        throw { statusCode: 400, message: `Referral lead #${lead_id} has already been RC completed and credited.` };
      }

      if (lead.status !== 'used' && lead.status !== 'mismatched') {
        throw { statusCode: 400, message: `Referral lead #${lead_id} status is '${lead.status}'. RC confirmation requires lead to be in 'used' status.` };
      }

      // Find sale & buyer customer from matched_sale_reference or lead_phone / aadhaar
      const buyerRes = await client.query(
        `SELECT c.customer_id, c.customer_name, v.vehicle_id, v.ex_showroom_price, v.vehicle_type, v.fuel_type
         FROM customers c
         LEFT JOIN vehicles v ON c.customer_id::text = v.customer_id::text AND c.tenant_id::text = v.tenant_id::text
         WHERE (c.aadhaar_hash = $1::text OR c.customer_id::text IN (SELECT customer_id::text FROM customer_phones WHERE phone_number = $2::text))
           AND c.tenant_id::text = $3::text
         ORDER BY v.created_at DESC LIMIT 1;`,
        [lead.lead_aadhaar_hash, lead.lead_phone, tenant_id]
      );

      if (buyerRes.rows.length === 0) {
        throw { statusCode: 400, message: `Could not locate buyer customer account matching lead Aadhaar or phone for lead #${lead_id}.` };
      }

      const buyer = buyerRes.rows[0];
      const exShowroomPaise = Number(buyer.ex_showroom_price || 50000000); // default 5 Lakhs fallback
      const category = (buyer.vehicle_type === '2W' || (buyer.fuel_type && buyer.fuel_type.toUpperCase().includes('2W'))) ? '2W' : '4W';

      // Slab Lookup
      const slabRes = await client.query(
        `SELECT points_awarded, price_range_label
         FROM referral_slabs
         WHERE tenant_id = $1 AND category = $2 AND price_min_paise <= $3 AND (price_max_paise IS NULL OR price_max_paise >= $3)
         LIMIT 1;`,
        [tenant_id, category, exShowroomPaise]
      );

      let pointsAwarded = 2500;
      let slabLabel = 'Standard Vehicle Referral';
      if (slabRes.rows.length > 0) {
        pointsAwarded = parseInt(slabRes.rows[0].points_awarded, 10);
        slabLabel = slabRes.rows[0].price_range_label;
      }

      // Credit Referrer
      await client.query(
        `INSERT INTO points_ledger (customer_id, vehicle_id, type, transaction_category, points, source_ref, tenant_id)
         VALUES ($1::text, $2, 'earn', 'referral', $3, $4, $5::text);`,
        [
          String(lead.referrer_customer_id),
          buyer.vehicle_id || null,
          pointsAwarded,
          `Referral Lead RC Bonus (Referrer): Awarded ${pointsAwarded} pts for lead ${lead.lead_name} (${slabLabel})`,
          String(tenant_id),
        ]
      );

      // Credit Buyer
      await client.query(
        `INSERT INTO points_ledger (customer_id, vehicle_id, type, transaction_category, points, source_ref, tenant_id)
         VALUES ($1::text, $2, 'earn', 'referral', $3, $4, $5::text);`,
        [
          String(buyer.customer_id),
          buyer.vehicle_id || null,
          pointsAwarded,
          `Referral Lead RC Bonus (Buyer): Awarded ${pointsAwarded} pts for vehicle purchase lead (${slabLabel})`,
          String(tenant_id),
        ]
      );

      // Update referrals table
      await client.query(
        `INSERT INTO referrals (referrer_customer_id, referred_customer_id, status, points_credited, tenant_id)
         VALUES ($1::text, $2::text, 'approved', $3, $4::text);`,
        [String(lead.referrer_customer_id), String(buyer.customer_id), pointsAwarded, String(tenant_id)]
      );

      // Update referral_leads status
      await client.query(
        `UPDATE referral_leads SET status = 'rc_completed', updated_at = NOW() WHERE id = $1;`,
        [lead_id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: `RC Completion confirmed for Lead #${lead_id}. Credited ${pointsAwarded} points to referrer (${lead.referrer_customer_id}) and buyer (${buyer.customer_id}).`,
        points_awarded: pointsAwarded,
        slab_label: slabLabel,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * List Referral Leads Pipeline for Admin
   */
  static async getReferralLeadsPipeline({ tenant_id, status, search }) {
    let query = `
      SELECT rl.id, rl.referrer_customer_id, c.customer_name AS referrer_name,
             rl.lead_name, rl.lead_phone, rl.generated_code, rl.status,
             rl.matched_sale_reference, rl.flagged_reason, rl.created_at, rl.updated_at
      FROM referral_leads rl
      LEFT JOIN customers c ON rl.referrer_customer_id = c.customer_id AND rl.tenant_id = c.tenant_id
      WHERE rl.tenant_id = $1
    `;
    const params = [tenant_id];
    let idx = 2;

    if (status && status !== 'all') {
      query += ` AND rl.status = $${idx++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (rl.lead_name ILIKE $${idx} OR rl.lead_phone ILIKE $${idx} OR rl.generated_code ILIKE $${idx} OR rl.referrer_customer_id ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY rl.created_at DESC LIMIT 100;`;
    const res = await pool.query(query, params);
    return res.rows;
  }
}

module.exports = ReferralService;
