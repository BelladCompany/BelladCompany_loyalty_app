const crypto = require('crypto');
const { pool } = require('../config/db');
const RedemptionEligibilityService = require('./redemption_eligibility.service');

class PublicBalanceService {
  /**
   * Formats full customer name into a privacy-safe string: First Name + Last Initial
   * e.g. "Rahul Sharma" -> "Rahul S.", "Kavya Bellad" -> "Kavya B.", "Anil" -> "Anil"
   */
  static maskCustomerName(fullName) {
    if (!fullName || typeof fullName !== 'string') return 'Valued Customer';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
  }

  /**
   * Retrieves an active, unexpired token for a customer or creates a new one with a 30-day expiry.
   */
  static async getOrCreateToken(customerId, tenantId = 'bellad_and_company') {
    const existingRes = await pool.query(
      `SELECT token
       FROM public_balance_tokens
       WHERE customer_id = $1 AND tenant_id = $2 AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1;`,
      [customerId, tenantId]
    );

    if (existingRes.rows.length > 0) {
      return existingRes.rows[0].token;
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO public_balance_tokens (customer_id, token, tenant_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days');`,
      [customerId, newToken, tenantId]
    );

    return newToken;
  }

  /**
   * Fetches read-only public balance pass payload by token.
   * Extends token expiry by 30 days (sliding expiration) upon access.
   */
  static async getPublicBalanceByToken(token) {
    if (!token) {
      throw { statusCode: 400, message: 'Public balance token is required.' };
    }

    // 1. Fetch token record
    const tokenRes = await pool.query(
      `SELECT id, customer_id, tenant_id, expires_at
       FROM public_balance_tokens
       WHERE token = $1 AND expires_at > NOW();`,
      [token]
    );

    if (tokenRes.rows.length === 0) {
      throw { statusCode: 404, message: 'Public balance pass is invalid or expired.' };
    }

    const tokenRecord = tokenRes.rows[0];
    const { customer_id, tenant_id, id: tokenId } = tokenRecord;

    // 2. Sliding expiration update: record view and extend expiry by 30 days
    await pool.query(
      `UPDATE public_balance_tokens
       SET last_viewed_at = NOW(),
           view_count = view_count + 1,
           expires_at = NOW() + INTERVAL '30 days'
       WHERE id = $1;`,
      [tokenId]
    );

    // 3. Fetch customer info & tier snapshot
    const customerRes = await pool.query(
      `SELECT c.customer_id, c.customer_name,
              COALESCE(cts.current_tier, 'Silver') AS tier
       FROM customers c
       LEFT JOIN customer_tier_snapshot cts ON c.customer_id = cts.customer_id AND c.tenant_id = cts.tenant_id
       WHERE c.customer_id = $1 AND c.tenant_id = $2;`,
      [customer_id, tenant_id]
    );

    if (customerRes.rows.length === 0) {
      throw { statusCode: 404, message: 'Associated customer account not found.' };
    }

    const customer = customerRes.rows[0];

    // 4. Compute live balance and lifetime points from points_ledger
    const pointsRes = await pool.query(
      `SELECT
         COALESCE(SUM(points), 0) AS current_balance,
         COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points
       FROM points_ledger
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [customer_id, tenant_id]
    );

    const currentBalance = parseInt(pointsRes.rows[0].current_balance, 10);
    const lifetimePoints = parseInt(pointsRes.rows[0].lifetime_points, 10);
    const discountValueRupees = Math.floor(currentBalance / 4);

    // 5. Fetch vehicle redemption eligibility details per vehicle
    const vehicleRes = await pool.query(
      `SELECT vehicle_id
       FROM vehicles
       WHERE customer_id = $1 AND tenant_id = $2
       ORDER BY vehicle_id ASC;`,
      [customer_id, tenant_id]
    );

    const vehiclesEligibility = [];
    for (const vRow of vehicleRes.rows) {
      try {
        const vStatus = await RedemptionEligibilityService.getVehicleRedemptionStatus(vRow.vehicle_id, tenant_id);
        vehiclesEligibility.push({
          vehicle_id: vStatus.vehicle_id,
          registration_number: vStatus.registration_number,
          status: vStatus.status,
          eligible_at: vStatus.eligible_at,
          expires_at: vStatus.expires_at,
          points_balance: vStatus.points_balance,
          message: vStatus.message,
        });
      } catch (vErr) {
        console.warn(`[PublicBalanceService] Could not resolve status for vehicle ID ${vRow.vehicle_id}:`, vErr.message);
      }
    }

    // Return strictly privacy-masked public payload
    return {
      customer_name: this.maskCustomerName(customer.customer_name),
      tier: customer.tier,
      current_balance: currentBalance,
      lifetime_points: lifetimePoints,
      discount_value_in_rs: discountValueRupees,
      points_conversion_rate: '4 points = ₹1 discount',
      vehicles_eligibility: vehiclesEligibility,
    };
  }

  /**
   * Revokes all active public balance tokens for a given customer.
   */
  static async revokeToken(customerId, tenantId = 'bellad_and_company') {
    const res = await pool.query(
      `UPDATE public_balance_tokens
       SET expires_at = NOW()
       WHERE customer_id = $1 AND tenant_id = $2 AND expires_at > NOW()
       RETURNING token;`,
      [customerId, tenantId]
    );
    return { revokedCount: res.rowCount };
  }

  /**
   * Revokes existing public balance tokens and generates a fresh 30-day token.
   */
  static async regenerateToken(customerId, tenantId = 'bellad_and_company') {
    await this.revokeToken(customerId, tenantId);
    const newToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO public_balance_tokens (customer_id, token, tenant_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days');`,
      [customerId, newToken, tenantId]
    );
    return newToken;
  }
}

module.exports = PublicBalanceService;
