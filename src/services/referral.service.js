const { pool } = require('../config/db');
const NotificationService = require('./notification.service');
const AuditLogService = require('./audit.service');

class ReferralService {
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
        `SELECT referral_id AS id, referral_id, referrer_customer_id, referred_customer_id, status
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
      // NEW
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
                   points_credited AS points_awarded, reason AS approval_reason, approved_by, approved_at;`,
        [points, reason.trim(), approver.id, referral_id, tenant_id]
      );

      const approvedReferral = updateRefRes.rows[0];

      // 4. Write immutable record to points_ledger (type: earn_referral)
      const ledgerRes = await client.query(
        `INSERT INTO points_ledger (
           customer_id, type, points, source_ref, cashier_id, tenant_id
         )
         VALUES ($1, 'earn_referral', $2, $3, $4, $5)
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

      // NEW
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

      // Audit Log event for manual referral points approval
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
          points_awarded: points,
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
             r.status, r.points_credited AS points_awarded, r.reason AS approval_reason,
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
   * Adds an authorized referral approver
   */
  static async addApprover({ name, tenant_id }) {
    const res = await pool.query(
      `INSERT INTO referral_approvers (name, active, tenant_id)
       VALUES ($1, TRUE, $2)
       RETURNING approver_id AS id, approver_id, name, active AS is_active, tenant_id, created_at;`,
      [name, tenant_id]
    );
    return res.rows[0];
  }
}

module.exports = ReferralService;
