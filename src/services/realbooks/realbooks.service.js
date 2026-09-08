const { pool } = require('../../config/db');
const realbooksClient = require('./realbooks.client');

class RealBooksService {
  /**
   * Queues a new redemption record for RealBooks API sync
   */
  static async queueRedemptionSync({ redemption, tenant_id, simulate_fail = false }) {
    const payload = {
      redemption_code: redemption.redemption_code,
      customer_id: redemption.customer_id,
      discount_amount_rupees: redemption.discount_amount_rupees || redemption.discount_amount,
      points_redeemed: redemption.points_redeemed,
      branch_id: redemption.branch_id,
      timestamp: redemption.created_at || new Date().toISOString(),
      ...(simulate_fail ? { simulate_fail: true } : {}),
    };

    const logRes = await pool.query(
      `INSERT INTO realbooks_sync_log (
         entity_type, entity_id, api_status, retry_count, tenant_id
       )
       VALUES ('redemption', $1, 'pending', 0, $2)
       RETURNING sync_id AS id, entity_type, entity_id AS redemption_code, api_status AS status, retry_count, tenant_id;`,
      [redemption.redemption_code, tenant_id]
    );

    const syncLog = logRes.rows[0];

    // Asynchronously trigger initial sync attempt without blocking caller
    setImmediate(() => {
      this.attemptSyncLog(syncLog.id, payload).catch((err) =>
        console.error(`Error in async RealBooks sync attempt for log ${syncLog.id}:`, err.message)
      );
    });

    return syncLog;
  }

  /**
   * Attempts to push a sync log to RealBooks API with exponential backoff on failure
   */
  static async attemptSyncLog(syncLogId, payload = null) {
    const logRes = await pool.query(
      `SELECT sync_id AS id, entity_type, entity_id AS redemption_code, api_status AS status, retry_count, tenant_id
       FROM realbooks_sync_log
       WHERE sync_id = $1;`,
      [syncLogId]
    );

    if (logRes.rows.length === 0) return null;
    const log = logRes.rows[0];

    const syncPayload = payload || {
      redemption_code: log.redemption_code,
      entity_type: log.entity_type,
    };

    try {
      const response = await realbooksClient.pushRedemption(syncPayload);

      // Sync Success
      const updatedRes = await pool.query(
        `UPDATE realbooks_sync_log
         SET api_status = 'synced',
             last_error = NULL,
             updated_at = NOW()
         WHERE sync_id = $1
         RETURNING sync_id AS id, entity_id AS redemption_code, api_status AS status, retry_count;`,
        [syncLogId]
      );

      console.log(`✅ [RealBooks Sync Success] Log ID: ${syncLogId}, Code: ${log.redemption_code}`);
      return updatedRes.rows[0];
    } catch (error) {
      // Sync Failure: Compute exponential backoff retry schedule
      const nextRetryCount = log.retry_count + 1;

      const updatedRes = await pool.query(
        `UPDATE realbooks_sync_log
         SET api_status = 'failed',
             retry_count = $1,
             last_error = $2,
             updated_at = NOW()
         WHERE sync_id = $3
         RETURNING sync_id AS id, entity_id AS redemption_code, api_status AS status, retry_count, last_error;`,
        [nextRetryCount, error.message, syncLogId]
      );

      console.warn(`⚠️ [RealBooks Sync Failed] Log ID: ${syncLogId}, Attempt: ${nextRetryCount}. Error: ${error.message}`);
      return updatedRes.rows[0];
    }
  }

  /**
   * Background retry worker: processes failed sync logs eligible for retry
   */
  static async processPendingRetryQueue() {
    try {
      const pendingLogsRes = await pool.query(
        `SELECT sync_id AS id, entity_id AS redemption_code, retry_count
         FROM realbooks_sync_log
         WHERE api_status = 'failed'
           AND retry_count < 5
         LIMIT 20;`
      );

      if (pendingLogsRes.rows.length === 0) return;

      console.log(`\n🔄 [RealBooks Retry Worker] Retrying ${pendingLogsRes.rows.length} pending failed sync logs...`);

      for (const log of pendingLogsRes.rows) {
        await this.attemptSyncLog(log.id);
      }
    } catch (error) {
      console.error('Error running RealBooks background retry worker:', error.message);
    }
  }

  /**
   * Retrieves RealBooks sync failures for admin inspection
   */
  static async getSyncFailures(tenantId, limit = 50, offset = 0) {
    const res = await pool.query(
      `SELECT rsl.sync_id AS id, rsl.entity_id AS redemption_id, rsl.entity_id AS redemption_code,
              rsl.api_status AS status, rsl.retry_count, rsl.last_error,
              rsl.created_at, rsl.updated_at
       FROM realbooks_sync_log rsl
       WHERE rsl.tenant_id = $1 AND rsl.api_status = 'failed'
       ORDER BY rsl.updated_at DESC
       LIMIT $2 OFFSET $3;`,
      [tenantId, limit, offset]
    );

    return res.rows;
  }

  /**
   * Admin trigger to manually retry a failed sync log immediately
   */
  static async manuallyRetrySync(syncLogId, tenantId) {
    const logCheck = await pool.query(
      `SELECT sync_id AS id FROM realbooks_sync_log WHERE sync_id = $1 AND tenant_id = $2;`,
      [syncLogId, tenantId]
    );

    if (logCheck.rows.length === 0) {
      throw { statusCode: 404, message: `RealBooks sync log '${syncLogId}' not found.` };
    }

    return this.attemptSyncLog(syncLogId);
  }
}

module.exports = RealBooksService;
