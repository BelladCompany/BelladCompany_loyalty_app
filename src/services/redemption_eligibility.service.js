const { pool } = require('../config/db');
const ModelRedemptionCapService = require('./modelRedemptionCap.service');

/**
 * RedemptionEligibilityService
 *
 * Manages the per-vehicle redemption lifecycle:
 *   locked   (0–12 months from purchase_date or last redemption)
 *   eligible (12–24 months)
 *   expired  (> 24 months — points permanently forfeited)
 *
 * Clock reset rule: after any redemption, the anchor date shifts to
 * the redemption date, so:
 *   eligible_at = redemption_date + 12 months
 *   expires_at  = redemption_date + 24 months
 *
 * Batch expiry rule: each points_ledger row has its own 24-month expiry
 * window from its created_at date (independent of the vehicle clock).
 * Expired batches are written off by the cron as 'expire' entries.
 */
class RedemptionEligibilityService {
  /**
   * Derives locked/eligible from anchor date.
   * Bellad & Co points NEVER expire.
   *
   * @param {Date|null} anchorDate  purchase_date (or last redemption date)
   * @param {Date}      now         current timestamp (injectable for testing)
   * @returns {{ status, eligible_at, expires_at: null }}
   */
  static computeStatusFromAnchor(anchorDate, now = new Date()) {
    if (!anchorDate) {
      // No purchase date on record — treat as locked until admin fills it in
      return { status: 'locked', eligible_at: null, expires_at: null };
    }

    const anchor = new Date(anchorDate);
    const eligible_at = new Date(anchor);
    eligible_at.setMonth(eligible_at.getMonth() + 12);

    if (now < eligible_at) return { status: 'locked', eligible_at, expires_at: null };
    return { status: 'eligible', eligible_at, expires_at: null };
  }

  /**
   * Returns the full redemption status for a specific vehicle.
   * Points NEVER expire.
   *
   * @returns {{
   *   status: 'locked'|'eligible',
   *   eligible_at: Date|null,
   *   expires_at: null,
   *   points_balance: number,
   *   expired_points: 0,
   *   vehicle_id: number,
   *   registration_number: string,
   *   purchase_date: Date|null,
   *   message: string,
   * }}
   */
  static async getVehicleRedemptionStatus(vehicleId, tenantId, category = null) {
    // 1. Fetch vehicle record
    const vehicleRes = await pool.query(
      `SELECT vehicle_id, customer_id, chassis_no AS registration_number, brand_name, model,
              purchase_date, dms_invoice_date, redemption_status, redemption_eligible_at, redemption_expires_at
       FROM vehicles
       WHERE vehicle_id = $1 AND tenant_id = $2;`,
      [vehicleId, tenantId]
    );

    if (vehicleRes.rows.length === 0) {
      throw { statusCode: 404, message: `Vehicle ID '${vehicleId}' not found.` };
    }

    const vehicle = vehicleRes.rows[0];

    // DMS Invoice Date is purchase_date
    let rawDate = vehicle.purchase_date || vehicle.dms_invoice_date;
    let purchaseDateObj = null;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) purchaseDateObj = d;
    }

    // 2. Determine eligibility date (12 months from purchase/anchor date)
    let eligible_at = vehicle.redemption_eligible_at ? new Date(vehicle.redemption_eligible_at) : null;

    if (!eligible_at && purchaseDateObj) {
      eligible_at = new Date(purchaseDateObj);
      eligible_at.setMonth(eligible_at.getMonth() + 12);
    }

    const now = new Date();
    let baseStatus = 'locked';

    if (!purchaseDateObj && !vehicle.redemption_eligible_at) {
      baseStatus = 'eligible';
    } else if (eligible_at && now >= eligible_at) {
      baseStatus = 'eligible';
    } else if (vehicle.redemption_status === 'eligible') {
      baseStatus = 'eligible';
    } else {
      baseStatus = 'locked';
    }

    // 4. Compute live points balance for this vehicle (Points Never Expire!)
    const balanceRes = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) AS total_earned,
         COALESCE(SUM(CASE WHEN pl.points < 0 THEN pl.points ELSE 0 END), 0) AS total_deductions
       FROM points_ledger pl
       WHERE pl.vehicle_id = $1 AND pl.tenant_id = $2 AND pl.type != 'expire';`,
      [vehicleId, tenantId]
    );

    const row = balanceRes.rows[0];
    const totalEarned = parseInt(row.total_earned, 10);
    const totalDeductions = Math.abs(parseInt(row.total_deductions, 10));

    // Points balance (Never expires!)
    const points_balance = Math.max(0, totalEarned - totalDeductions);
    const expired_points = 0;

    // ACCESSORIES EXEMPTION: Accessories redemption is allowed ANYTIME without the 12-month lock!
    const isAccessories = ['accessories', 'accessory'].includes(String(category || '').trim().toLowerCase());
    let status = baseStatus;

    if (isAccessories) {
      if (baseStatus === 'locked') {
        status = 'eligible';
      }
    }

    // 4b. Resolve model-specific redemption percentage cap (Max 50% cap enforced)
    const resolvedCap = await ModelRedemptionCapService.resolveCap({
      tenant_id: tenantId,
      brand_name: vehicle.brand_name,
      model_name: vehicle.model,
    });
    const capPercent = resolvedCap.cap_percent != null ? Math.min(50.0, Number(resolvedCap.cap_percent)) : 50.0;
    const maxRedeemablePoints = Math.floor(points_balance * (capPercent / 100));

    // 5. Build human-readable message
    let message;
    if (!vehicle.purchase_date && !vehicle.redemption_eligible_at) {
      message = capPercent < 100
        ? `Active for point calculation and redemption. (Capped up to ${capPercent}% for ${vehicle.model || vehicle.brand_name}: max ${maxRedeemablePoints.toLocaleString()} pts / ₹${(maxRedeemablePoints * 0.25).toFixed(0)} discount).`
        : 'Active for point calculation and redemption.';
    } else if (isAccessories && baseStatus === 'locked') {
      message = capPercent < 100
        ? `Eligible to redeem anytime for Accessories! (Capped up to ${capPercent}% for ${vehicle.model || vehicle.brand_name}: max ${maxRedeemablePoints.toLocaleString()} pts / ₹${(maxRedeemablePoints * 0.25).toFixed(0)} discount).`
        : `Eligible to redeem anytime for Accessories! (${points_balance.toLocaleString()} pts available).`;
    } else if (status === 'locked') {
      const eligibleStr = eligible_at
        ? eligible_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';
      message = `Points are locked for Service / Sales until ${eligibleStr}. (Accessories redemption is unlocked anytime).`;
    } else {
      message = capPercent < 100
        ? `Eligible to redeem up to ${capPercent}%! (${maxRedeemablePoints.toLocaleString()} of ${points_balance.toLocaleString()} pts / ₹${(maxRedeemablePoints * 0.25).toFixed(0)} discount based on ${vehicle.model || vehicle.brand_name} policy).`
        : `Eligible to redeem! (${points_balance.toLocaleString()} pts available - Points never expire).`;
    }

    return {
      vehicle_id: vehicle.vehicle_id,
      customer_id: vehicle.customer_id,
      registration_number: vehicle.registration_number,
      brand_name: vehicle.brand_name,
      model_name: vehicle.model,
      redemption_cap_percent: capPercent,
      max_redeemable_points: maxRedeemablePoints,
      cap_rule_description: resolvedCap.description,
      purchase_date: vehicle.purchase_date,
      status,
      base_status: baseStatus,
      accessories_eligible: points_balance > 0,
      eligible_at: eligible_at?.toISOString() ?? null,
      expires_at: null,
      points_balance,
      expired_points: 0,
      message,
    };
  }

  /**
   * Resets/maintains the vehicle redemption clock after a successful redemption.
   * Called inside the redemption transaction (uses the passed client).
   *
   * Customer remains ELIGIBLE to redeem N times up to full points balance.
   * Expiration window is extended to 24 months from the latest redemption date.
   * Only locks/expires if customer has 24 months of total inactivity.
   *
   * @param {number} vehicleId
   * @param {Date}   redemptionDate
   * @param {string} tenantId
   * @param {object} client  — pg PoolClient (transaction-safe)
   * @param {string} [category] - category of the redemption ('accessories', 'service', etc.)
   */
  static async resetClockOnRedemption(vehicleId, redemptionDate, tenantId, client, category = null) {
    const anchor = new Date(redemptionDate);

    const newExpiresAt = new Date(anchor);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + 24);

    const isAccessories = ['accessories', 'accessory'].includes(String(category || '').trim().toLowerCase());

    // Fetch existing vehicle record to check if it is still within its initial 12-month lock period
    const vRes = await client.query(
      `SELECT purchase_date, dms_invoice_date, redemption_status, redemption_eligible_at
       FROM vehicles WHERE vehicle_id = $1 AND tenant_id = $2;`,
      [vehicleId, tenantId]
    );

    const vRow = vRes.rows[0];
    let purchaseDateObj = null;
    if (vRow) {
      const rawDate = vRow.purchase_date || vRow.dms_invoice_date;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) purchaseDateObj = d;
      }
    }

    let eligible_at = vRow?.redemption_eligible_at ? new Date(vRow.redemption_eligible_at) : null;
    if (!eligible_at && purchaseDateObj) {
      eligible_at = new Date(purchaseDateObj);
      eligible_at.setMonth(eligible_at.getMonth() + 12);
    }

    const now = new Date();
    const stillWithinLockPeriod = eligible_at && now < eligible_at;

    // If an accessories redemption occurs while the vehicle is still within the 12-month lock period,
    // do NOT prematurely mark redemption_status = 'eligible' for general (service/sales) redemptions.
    // It remains locked for general redemptions until eligible_at is reached.
    const newStatus = (isAccessories && stillWithinLockPeriod) ? 'locked' : 'eligible';

    await client.query(
      `UPDATE vehicles
       SET redemption_status        = $1,
           redemption_eligible_at   = COALESCE(redemption_eligible_at, $2),
           redemption_expires_at    = NULL,
           redemption_notified_3m   = FALSE,
           redemption_notified_1m   = FALSE,
           updated_at               = NOW()
       WHERE vehicle_id = $3 AND tenant_id = $4;`,
      [newStatus, (eligible_at ? eligible_at.toISOString() : anchor.toISOString()), vehicleId, tenantId]
    );
  }

  /**
   * Updates the cached `redemption_status` column on all vehicles for a tenant.
   * Locked → Eligible (12 months passed).
   * Points never expire. Any vehicles previously marked 'expired' are restored to 'eligible'.
   *
   * @param {string} tenantId
   * @returns {{ to_eligible: number, to_expired: 0 }}
   */
  static async refreshAllVehicleStatuses(tenantId) {
    const now = new Date().toISOString();

    // Transition: locked or expired → eligible (12 months passed or points restored)
    const toEligible = await pool.query(
      `UPDATE vehicles
       SET redemption_status = 'eligible',
           redemption_expires_at = NULL,
           updated_at = NOW()
       WHERE tenant_id = $1
         AND (
           (redemption_status = 'locked' AND redemption_eligible_at IS NOT NULL AND redemption_eligible_at <= $2)
           OR redemption_status = 'expired'
         )
       RETURNING vehicle_id;`,
      [tenantId, now]
    );

    // Back-fill: vehicles with purchase_date but no eligibility columns yet
    await pool.query(
      `UPDATE vehicles
       SET redemption_eligible_at = (purchase_date + INTERVAL '12 months')::TIMESTAMPTZ,
           redemption_expires_at  = NULL,
           updated_at = NOW()
       WHERE tenant_id = $1
         AND purchase_date IS NOT NULL
         AND redemption_eligible_at IS NULL;`,
      [tenantId]
    );

    return {
      to_eligible: toEligible.rowCount,
      to_expired: 0,
    };
  }

  /**
   * Points never expire per Bellad & Co business policy.
   * No forfeiture entries are created.
   *
   * @param {string} tenantId
   * @param {object} [dbClient]
   * @returns {number} 0
   */
  static async writeOffExpiredBatches(tenantId, dbClient = pool) {
    // Points never expire — writeOff is permanently disabled
    return 0;
  }

  /**
   * Returns vehicles nearing expiry. Points never expire, returns empty array.
   */
  static async getVehiclesNearingExpiry(tenantId, daysAhead, notifiedFlag) {
    // Points never expire
    return [];
  }

  /**
   * Marks the notification flag on a vehicle to prevent duplicate sends.
   *
   * @param {number} vehicleId
   * @param {'notified_3m'|'notified_1m'} notifiedFlag
   */
  static async markNotificationSent(vehicleId, notifiedFlag) {
    const flagColumn = notifiedFlag === 'notified_3m'
      ? 'redemption_notified_3m'
      : 'redemption_notified_1m';

    await pool.query(
      `UPDATE vehicles SET ${flagColumn} = TRUE, updated_at = NOW() WHERE vehicle_id = $1;`,
      [vehicleId]
    );
  }
}

module.exports = RedemptionEligibilityService;
