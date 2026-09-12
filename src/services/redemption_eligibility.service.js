const { pool } = require('../config/db');

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
   * Derives locked/eligible/expired from two date anchors.
   * Pure function — no DB access, testable independently.
   *
   * @param {Date|null} anchorDate  purchase_date (or last redemption date)
   * @param {Date}      now         current timestamp (injectable for testing)
   * @returns {{ status, eligible_at, expires_at }}
   */
  static computeStatusFromAnchor(anchorDate, now = new Date()) {
    if (!anchorDate) {
      // No purchase date on record — treat as locked until admin fills it in
      return { status: 'locked', eligible_at: null, expires_at: null };
    }

    const anchor = new Date(anchorDate);
    const eligible_at = new Date(anchor);
    eligible_at.setMonth(eligible_at.getMonth() + 12);

    const expires_at = new Date(anchor);
    expires_at.setMonth(expires_at.getMonth() + 24);

    if (now < eligible_at) return { status: 'locked', eligible_at, expires_at };
    if (now < expires_at) return { status: 'eligible', eligible_at, expires_at };
    return { status: 'expired', eligible_at, expires_at };
  }

  /**
   * Returns the full redemption status for a specific vehicle.
   *
   * Anchor priority:
   *   1. vehicles.redemption_expires_at / redemption_eligible_at (set after a redemption)
   *   2. vehicles.purchase_date (original anchor for vehicles that have never redeemed)
   *
   * @returns {{
   *   status: 'locked'|'eligible'|'expired',
   *   eligible_at: Date|null,
   *   expires_at: Date|null,
   *   points_balance: number,         // non-expired points only
   *   expired_points: number,         // points that have already forfeited
   *   vehicle_id: number,
   *   registration_number: string,
   *   purchase_date: Date|null,
   *   message: string,
   * }}
   */
  static async getVehicleRedemptionStatus(vehicleId, tenantId) {
    // 1. Fetch vehicle record
    const vehicleRes = await pool.query(
      `SELECT vehicle_id, customer_id, chassis_no AS registration_number,
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

    // 2. Determine eligibility & expiration dates
    let eligible_at = vehicle.redemption_eligible_at ? new Date(vehicle.redemption_eligible_at) : null;
    let expires_at = vehicle.redemption_expires_at ? new Date(vehicle.redemption_expires_at) : null;

    if (!eligible_at && purchaseDateObj) {
      eligible_at = new Date(purchaseDateObj);
      eligible_at.setMonth(eligible_at.getMonth() + 12);
    }
    if (!expires_at && purchaseDateObj) {
      expires_at = new Date(purchaseDateObj);
      expires_at.setMonth(expires_at.getMonth() + 24);
    }

    const now = new Date();
    let status = 'locked';

    if (!purchaseDateObj && !vehicle.redemption_eligible_at) {
      status = 'eligible';
    } else if (expires_at && now >= expires_at) {
      status = 'expired';
    } else if (eligible_at && now >= eligible_at) {
      status = 'eligible';
    } else if (vehicle.redemption_status === 'eligible') {
      status = 'eligible';
    } else {
      status = 'locked';
    }

    // 3. Check if there is a pending billing correction request for this customer
    const pendingRes = await pool.query(
      `SELECT id, points_ledger_reference FROM correction_requests
       WHERE customer_id = $1 AND tenant_id = $2 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1;`,
      [vehicle.customer_id, tenantId]
    );

    const pendingTicket = pendingRes.rows[0];
    if (pendingTicket) {
      status = 'locked_pending_correction';
    }

    // 4. Compute live non-expired points balance for this vehicle
    const balanceRes = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN pl.created_at > NOW() - INTERVAL '24 months' AND pl.points > 0 THEN pl.points ELSE 0 END), 0) AS non_expired_earned,
         COALESCE(SUM(CASE WHEN pl.created_at <= NOW() - INTERVAL '24 months' AND pl.points > 0 THEN pl.points ELSE 0 END), 0) AS expired_earned,
         COALESCE(SUM(CASE WHEN pl.points < 0 THEN pl.points ELSE 0 END), 0) AS total_deductions
       FROM points_ledger pl
       WHERE pl.vehicle_id = $1 AND pl.tenant_id = $2 AND pl.type != 'expire';`,
      [vehicleId, tenantId]
    );

    const row = balanceRes.rows[0];
    const nonExpiredEarned = parseInt(row.non_expired_earned, 10);
    const expiredEarned = parseInt(row.expired_earned, 10);
    const totalDeductions = Math.abs(parseInt(row.total_deductions, 10));

    // Apply deductions to non-expired balance first (FIFO: oldest redeemed first)
    const points_balance = Math.max(0, nonExpiredEarned - totalDeductions);
    const expired_points = expiredEarned;

    // 5. Build human-readable message
    let message;
    if (status === 'locked_pending_correction') {
      message = `Billing Correction Ticket #${pendingTicket.id} is pending Admin review. Point transactions & redemptions are locked until Admin approves or rejects the request.`;
    } else if (!vehicle.purchase_date && !vehicle.redemption_eligible_at) {
      message = 'Active for point calculation and redemption.';
    } else if (status === 'locked') {
      const eligibleStr = eligible_at
        ? eligible_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';
      message = `Points are locked. Eligible to redeem from ${eligibleStr}.`;
    } else if (status === 'eligible') {
      const expiresStr = expires_at
        ? expires_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';
      message = `Eligible to redeem! Valid until ${expiresStr} (${points_balance.toLocaleString()} pts available).`;
    } else {
      const expiredStr = expires_at
        ? expires_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';
      message = `Points expired on ${expiredStr}. All accumulated points have been permanently forfeited.`;
    }

    return {
      vehicle_id: vehicle.vehicle_id,
      customer_id: vehicle.customer_id,
      registration_number: vehicle.registration_number,
      purchase_date: vehicle.purchase_date,
      status,
      eligible_at: eligible_at?.toISOString() ?? null,
      expires_at: expires_at?.toISOString() ?? null,
      points_balance,
      expired_points,
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
   */
  static async resetClockOnRedemption(vehicleId, redemptionDate, tenantId, client) {
    const anchor = new Date(redemptionDate);

    const newExpiresAt = new Date(anchor);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + 24);

    await client.query(
      `UPDATE vehicles
       SET redemption_status        = 'eligible',
           redemption_eligible_at   = COALESCE(redemption_eligible_at, $1),
           redemption_expires_at    = $2,
           redemption_notified_3m   = FALSE,
           redemption_notified_1m   = FALSE,
           updated_at               = NOW()
       WHERE vehicle_id = $3 AND tenant_id = $4;`,
      [anchor.toISOString(), newExpiresAt.toISOString(), vehicleId, tenantId]
    );
  }

  /**
   * Updates the cached `redemption_status` column on all vehicles for a tenant
   * based on the current date vs. their stored eligible_at / expires_at.
   *
   * Intended to be called by the daily cron job.
   * Returns counts of vehicles moved into each status.
   *
   * @param {string} tenantId
   * @returns {{ locked: number, eligible: number, expired: number }}
   */
  static async refreshAllVehicleStatuses(tenantId) {
    const now = new Date().toISOString();

    // Transition: locked → eligible (12 months passed)
    const toEligible = await pool.query(
      `UPDATE vehicles
       SET redemption_status = 'eligible', updated_at = NOW()
       WHERE tenant_id = $1
         AND redemption_status = 'locked'
         AND purchase_date IS NOT NULL
         AND redemption_eligible_at IS NOT NULL
         AND redemption_eligible_at <= $2
       RETURNING vehicle_id;`,
      [tenantId, now]
    );

    // Transition: eligible → expired (24 months passed)
    const toExpired = await pool.query(
      `UPDATE vehicles
       SET redemption_status = 'expired', updated_at = NOW()
       WHERE tenant_id = $1
         AND redemption_status = 'eligible'
         AND redemption_expires_at IS NOT NULL
         AND redemption_expires_at <= $2
       RETURNING vehicle_id;`,
      [tenantId, now]
    );

    // Back-fill: vehicles with purchase_date but no eligibility columns yet
    await pool.query(
      `UPDATE vehicles
       SET redemption_eligible_at = (purchase_date + INTERVAL '12 months')::TIMESTAMPTZ,
           redemption_expires_at  = (purchase_date + INTERVAL '24 months')::TIMESTAMPTZ,
           updated_at = NOW()
       WHERE tenant_id = $1
         AND purchase_date IS NOT NULL
         AND redemption_eligible_at IS NULL;`,
      [tenantId]
    );

    return {
      to_eligible: toEligible.rowCount,
      to_expired: toExpired.rowCount,
    };
  }

  /**
   * Writes forfeiture ledger entries ('expire' type, negative points) for all
   * points_ledger batches that are older than 24 months and have not yet been
   * written off.
   *
   * A batch is considered written off if there is already an 'expire' entry
   * with the same vehicle_id referencing the original entry via source_ref.
   *
   * This function is idempotent — safe to run multiple times.
   *
   * @param {string} tenantId
   * @param {object} [dbClient]  optional pg client for transaction use
   * @returns {number} number of forfeiture entries created
   */
  static async writeOffExpiredBatches(tenantId, dbClient = pool) {
    // Find all earning entries older than 24 months that haven't been forfeited
    const expiredBatches = await dbClient.query(
      `SELECT pl.entry_id, pl.customer_id, pl.vehicle_id, pl.branch_id, pl.points, pl.tenant_id
       FROM points_ledger pl
       WHERE pl.tenant_id = $1
         AND pl.points > 0
         AND pl.type IN ('earn_sale', 'earn_service', 'earn_referral', 'adjust')
         AND pl.created_at <= NOW() - INTERVAL '24 months'
         AND NOT EXISTS (
           SELECT 1 FROM points_ledger ex
           WHERE ex.tenant_id = pl.tenant_id
             AND ex.type = 'expire'
             AND ex.source_ref = 'Forfeiture: entry#' || pl.entry_id::text
         );`,
      [tenantId]
    );

    let count = 0;
    for (const batch of expiredBatches.rows) {
      // Insert a forfeiture entry (negative points) to offset the original earning
      await dbClient.query(
        `INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, tenant_id)
         VALUES ($1, $2, $3, 'expire', 'expiry', $4, $5, $6);`,
        [
          batch.customer_id,
          batch.vehicle_id || null,
          batch.branch_id || null,
          -batch.points, // Reverse the earning
          `Forfeiture: entry#${batch.entry_id}`,
          tenantId,
        ]
      );
      count++;
    }

    return count;
  }

  /**
   * Returns vehicles whose expiry date falls within a given number of days from now.
   * Used by the cron job to identify which customers to send reminder notifications.
   *
   * @param {string} tenantId
   * @param {number} daysAhead  e.g. 90 (3 months) or 30 (1 month)
   * @param {'notified_3m'|'notified_1m'} notifiedFlag  column to check/set
   * @returns {Array} rows with vehicle_id, customer_id, registration_number, expires_at
   */
  static async getVehiclesNearingExpiry(tenantId, daysAhead, notifiedFlag) {
    const flagColumn = notifiedFlag === 'notified_3m'
      ? 'redemption_notified_3m'
      : 'redemption_notified_1m';

    const res = await pool.query(
      `SELECT v.vehicle_id, v.customer_id, v.chassis_no AS registration_number,
              v.redemption_expires_at, v.redemption_status
       FROM vehicles v
       WHERE v.tenant_id = $1
         AND v.redemption_status = 'eligible'
         AND v.redemption_expires_at IS NOT NULL
         AND v.redemption_expires_at <= NOW() + ($2 || ' days')::INTERVAL
         AND v.redemption_expires_at > NOW()
         AND ${flagColumn} = FALSE;`,
      [tenantId, daysAhead]
    );

    return res.rows;
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
