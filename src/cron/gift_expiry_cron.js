const GiftEngineService = require('../services/giftEngine.service');
const { pool } = require('../config/db');

/**
 * Gift Expiry & Reversion Background Worker
 * Checks for unclaimed gifts older than 30 days (or their expires_at date)
 * and automatically refunds points to the sender or queues Razorpay refund.
 */
async function runGiftExpiryWorker() {
  try {
    const tenantsRes = await pool.query(`SELECT DISTINCT tenant_id FROM customer_gifts WHERE claim_status = 'unclaimed';`);
    const tenants = tenantsRes.rows.map((r) => r.tenant_id);

    if (tenants.length === 0) return;

    for (const tenantId of tenants) {
      const result = await GiftEngineService.expireUnclaimedGifts(tenantId);
      if (result.processed > 0) {
        console.log(`[GiftExpiryWorker] Auto-expired and reverted ${result.processed} gift(s) for tenant '${tenantId}'.`);
      }
    }
  } catch (err) {
    console.error('[GiftExpiryWorker Error]:', err.message);
  }
}

function startGiftExpiryCron() {
  // Run on startup
  setTimeout(runGiftExpiryWorker, 5000);

  // Run every 1 hour (3600000 ms)
  setInterval(runGiftExpiryWorker, 60 * 60 * 1000);
  console.log('🎁 [GiftExpiryWorker] Automated gift expiry & auto-reversion worker registered (every 1 hour).');
}

module.exports = {
  runGiftExpiryWorker,
  startGiftExpiryCron,
};
