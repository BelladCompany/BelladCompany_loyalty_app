const { pool } = require('../config/db');
const RedemptionEligibilityService = require('../services/redemption_eligibility.service');
const NotificationService = require('../services/notification.service');

/**
 * Redemption Status Cron Job
 *
 * Runs once daily on server start and every 24 hours thereafter.
 * Responsibilities:
 *   1. Refresh vehicle redemption statuses (locked → eligible → expired) for all tenants.
 *   2. Write off expired point batches as 'expire' ledger entries (forfeiture).
 *   3. Send 3-month expiry reminder notifications (WhatsApp) and mark flag.
 *   4. Send 1-month expiry reminder notifications (WhatsApp) and mark flag.
 *
 * All operations are non-destructive — points_ledger is append-only so forfeiture
 * is recorded as a negative 'expire' entry, not a deletion.
 */

const DAYS_IN_3_MONTHS = 90;
const DAYS_IN_1_MONTH  = 30;

async function runRedemptionStatusCron() {
  const startTime = Date.now();
  console.log(`\n🕐 [RedemptionCron] Starting daily cron run at ${new Date().toISOString()}`);

  try {
    // ── 0. Fetch all tenant IDs ───────────────────────────────────────────────
    const tenantsRes = await pool.query(
      `SELECT DISTINCT tenant_id FROM vehicles WHERE purchase_date IS NOT NULL;`
    );
    const tenants = tenantsRes.rows.map((r) => r.tenant_id);

    if (tenants.length === 0) {
      console.log('   ℹ️  No tenants with vehicle data found. Cron done.');
      return;
    }

    let totalToEligible = 0;
    let totalToExpired = 0;
    let totalForfeited = 0;
    let totalReminders3m = 0;
    let totalReminders1m = 0;

    for (const tenantId of tenants) {
      console.log(`\n   📋 Processing tenant: ${tenantId}`);

      // ── 1. Refresh all vehicle statuses for this tenant ───────────────────
      try {
        const statusCounts = await RedemptionEligibilityService.refreshAllVehicleStatuses(tenantId);
        totalToEligible += statusCounts.to_eligible;
        totalToExpired  += statusCounts.to_expired;
        console.log(
          `      ✅ Status refresh: ${statusCounts.to_eligible} → eligible, ${statusCounts.to_expired} → expired`
        );
      } catch (err) {
        console.error(`      ❌ Status refresh failed for tenant '${tenantId}':`, err.message);
      }

      // ── 2. Write off expired point batches (forfeiture) ───────────────────
      try {
        const forfeited = await RedemptionEligibilityService.writeOffExpiredBatches(tenantId);
        totalForfeited += forfeited;
        if (forfeited > 0) {
          console.log(`      ✅ Forfeited ${forfeited} expired point batch(es) for tenant '${tenantId}'`);
        } else {
          console.log(`      ℹ️  No expired batches to write off for tenant '${tenantId}'`);
        }
      } catch (err) {
        console.error(`      ❌ Forfeiture write-off failed for tenant '${tenantId}':`, err.message);
      }

      // ── 3. Send 3-month expiry reminders ─────────────────────────────────
      try {
        const vehicles3m = await RedemptionEligibilityService.getVehiclesNearingExpiry(
          tenantId, DAYS_IN_3_MONTHS, 'notified_3m'
        );

        for (const vehicle of vehicles3m) {
          try {
            // Get live redeemable balance for this vehicle
            const status = await RedemptionEligibilityService.getVehicleRedemptionStatus(
              vehicle.vehicle_id, tenantId
            );

            if (status.points_balance > 0) {
              // Get primary phone
              const phoneRes = await pool.query(
                `SELECT phone_number FROM customer_phones
                 WHERE customer_id = $1 AND tenant_id = $2
                 ORDER BY is_verified DESC, phone_id ASC LIMIT 1;`,
                [vehicle.customer_id, tenantId]
              );
              const phone = phoneRes.rows[0]?.phone_number || null;

              await NotificationService.sendExpiryReminderNotification({
                customer_id: vehicle.customer_id,
                phone,
                points: status.points_balance,
                expires_at: vehicle.redemption_expires_at,
                vehicle_reg: vehicle.registration_number,
                reminder_type: '3m',
                tenant_id: tenantId,
              });

              await RedemptionEligibilityService.markNotificationSent(vehicle.vehicle_id, 'notified_3m');
              totalReminders3m++;
              console.log(`      📲 3-month reminder sent: vehicle ${vehicle.vehicle_id} (${vehicle.registration_number})`);
            }
          } catch (vehicleErr) {
            console.error(
              `      ❌ 3m reminder failed for vehicle ${vehicle.vehicle_id}:`,
              vehicleErr.message
            );
          }
        }
      } catch (err) {
        console.error(`      ❌ 3-month reminder query failed for tenant '${tenantId}':`, err.message);
      }

      // ── 4. Send 1-month expiry reminders ─────────────────────────────────
      try {
        const vehicles1m = await RedemptionEligibilityService.getVehiclesNearingExpiry(
          tenantId, DAYS_IN_1_MONTH, 'notified_1m'
        );

        for (const vehicle of vehicles1m) {
          try {
            const status = await RedemptionEligibilityService.getVehicleRedemptionStatus(
              vehicle.vehicle_id, tenantId
            );

            if (status.points_balance > 0) {
              const phoneRes = await pool.query(
                `SELECT phone_number FROM customer_phones
                 WHERE customer_id = $1 AND tenant_id = $2
                 ORDER BY is_verified DESC, phone_id ASC LIMIT 1;`,
                [vehicle.customer_id, tenantId]
              );
              const phone = phoneRes.rows[0]?.phone_number || null;

              await NotificationService.sendExpiryReminderNotification({
                customer_id: vehicle.customer_id,
                phone,
                points: status.points_balance,
                expires_at: vehicle.redemption_expires_at,
                vehicle_reg: vehicle.registration_number,
                reminder_type: '1m',
                tenant_id: tenantId,
              });

              await RedemptionEligibilityService.markNotificationSent(vehicle.vehicle_id, 'notified_1m');
              totalReminders1m++;
              console.log(`      📲 1-month URGENT reminder sent: vehicle ${vehicle.vehicle_id} (${vehicle.registration_number})`);
            }
          } catch (vehicleErr) {
            console.error(
              `      ❌ 1m reminder failed for vehicle ${vehicle.vehicle_id}:`,
              vehicleErr.message
            );
          }
        }
      } catch (err) {
        console.error(`      ❌ 1-month reminder query failed for tenant '${tenantId}':`, err.message);
      }
    } // end tenant loop

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🏁 [RedemptionCron] Completed in ${elapsed}s:`);
    console.log(`   • Vehicles → eligible:  ${totalToEligible}`);
    console.log(`   • Vehicles → expired:   ${totalToExpired}`);
    console.log(`   • Point batches forfeited: ${totalForfeited}`);
    console.log(`   • 3-month reminders sent:  ${totalReminders3m}`);
    console.log(`   • 1-month reminders sent:  ${totalReminders1m}`);
  } catch (fatalErr) {
    console.error('💥 [RedemptionCron] Fatal error:', fatalErr.message, fatalErr.stack);
  }
}

/**
 * Starts the daily cron scheduler.
 * Runs once immediately on startup, then every 24 hours.
 * Exposed as a function so index.js can control when it begins.
 */
function startRedemptionStatusCron() {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Delay first run by 30 seconds to let the server fully boot
  setTimeout(() => {
    runRedemptionStatusCron().catch((err) =>
      console.error('[RedemptionCron] Initial run error:', err.message)
    );
    // Then schedule every 24 hours
    setInterval(() => {
      runRedemptionStatusCron().catch((err) =>
        console.error('[RedemptionCron] Scheduled run error:', err.message)
      );
    }, TWENTY_FOUR_HOURS);
  }, 30_000);

  console.log('📅 [RedemptionCron] Daily redemption status cron scheduled (first run in 30s).');
}

module.exports = { startRedemptionStatusCron, runRedemptionStatusCron };
