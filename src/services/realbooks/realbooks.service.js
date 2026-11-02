const { pool } = require('../../config/db');
const realbooksClient = require('./realbooks.client');

class RealBooksService {
  /**
   * 1. Resolves customer profile for RealBooks Ledger Creation
   */
  static async resolveCustomerProfile(customerId, tenantId) {
    const custRes = await pool.query(
      `SELECT c.customer_id, c.customer_name AS name, c.email, c.pan_no, c.gst_number,
              c.address, c.city, c.state, c.ledger_name, c.ledger_code, c.ledger_group
       FROM customers c
       WHERE c.customer_id = $1 AND c.tenant_id = $2
       LIMIT 1;`,
      [customerId, tenantId]
    );

    if (custRes.rows.length === 0) {
      return {
        customer_id: customerId,
        name: customerId,
        phone: '',
      };
    }

    const customer = custRes.rows[0];

    const phoneRes = await pool.query(
      `SELECT phone_number
       FROM customer_phones
       WHERE customer_id = $1 AND tenant_id = $2
       ORDER BY is_verified DESC, phone_id ASC
       LIMIT 1;`,
      [customerId, tenantId]
    );

    customer.phone = phoneRes.rows[0]?.phone_number || '';
    return customer;
  }

  /**
   * 2. Push / Sync Customer Ledger to RealBooks
   * Documented in PDF: Section 3 / Page 48-50
   */
  static async pushCustomerLedger({ customer_id, tenant_id = 'bellad_and_company' }) {
    const customer = await this.resolveCustomerProfile(customer_id, tenant_id);

    const clientRes = await realbooksClient.createOrUpdateCustomerLedger(customer);

    try {
      await pool.query(
        `INSERT INTO realbooks_sync_log (
           entity_type, entity_id, api_status, retry_count, tenant_id, request_payload, response_payload
         )
         VALUES ('customer_ledger', $1, $2, 0, $3, $4, $5);`,
        [
          customer_id,
          clientRes.status,
          tenant_id,
          JSON.stringify(clientRes.request_payload || {}),
          JSON.stringify(clientRes.response_payload || {}),
        ]
      );
    } catch (e) {
      console.warn('[RealBooksService] Failed to insert customer_ledger sync log:', e.message);
    }

    return {
      success: clientRes.success,
      mode: clientRes.mode,
      customer_id,
      ledger_name: `${customer.name} (${customer_id})`,
      realbooks_ledger_id: clientRes.realbooks_ledger_id,
      message: clientRes.message,
      data: clientRes,
    };
  }

  /**
   * 3. Push Receipt Transaction / Double Entry Voucher to RealBooks
   * Documented in PDF: Section 2 / Page 39-44
   * Synchronously or asynchronously pushes:
   *   1. Customer Ledger
   *   2. Balanced Double-Entry Account Voucher
   */
  static async pushReceiptTransaction({
    receipt_no,
    customer_id,
    bill_amount,
    discount_amount = 0,
    points_redeemed = 0,
    category = 'service',
    branch_id = 1,
    job_card = '',
    tenant_id = 'bellad_and_company',
  }) {
    const code = receipt_no || `REC-${Date.now()}`;
    const customer = await this.resolveCustomerProfile(customer_id, tenant_id);

    // 1. Ensure Customer Ledger is Synced/Pushed
    const ledgerSync = await realbooksClient.createOrUpdateCustomerLedger(customer);

    // 2. Push Double-Entry Account Voucher
    const voucherSync = await realbooksClient.createAccountVoucher({
      receiptNo: code,
      customerName: customer.name,
      customerId: customer_id,
      billAmount: bill_amount,
      discountAmount: discount_amount,
      cashPaid: Math.max(0, bill_amount - discount_amount),
      category,
      jobCard: job_card,
      branchName: 'Bellad Hubli',
      date: new Date(),
    });

    try {
      await pool.query(
        `INSERT INTO realbooks_sync_log (
           entity_type, entity_id, api_status, retry_count, tenant_id, request_payload, response_payload
         )
         VALUES ('receipt_voucher', $1, $2, 0, $3, $4, $5);`,
        [
          code,
          voucherSync.status,
          tenant_id,
          JSON.stringify(voucherSync.request_payload || {}),
          JSON.stringify(voucherSync.response_payload || {}),
        ]
      );
    } catch (e) {
      console.warn('[RealBooksService] Failed to insert receipt_voucher sync log:', e.message);
    }

    return {
      success: voucherSync.success,
      status: voucherSync.status,
      mode: voucherSync.mode,
      message: voucherSync.message,
      receipt_no: code,
      voucher_id: voucherSync.realbooks_voucher_id,
      ledger_id: ledgerSync.realbooks_ledger_id,
      customer_id,
      customer_name: customer.name,
      bill_amount: Number(bill_amount),
      discount_amount: Number(discount_amount),
      cash_paid: Math.max(0, Number(bill_amount) - Number(discount_amount)),
      synced_at: voucherSync.synced_at,
      request_payload: voucherSync.request_payload,
      response_payload: voucherSync.response_payload,
    };
  }

  /**
   * Direct sync wrapper used by receipt modal and controllers
   */
  static async syncReceiptDirect(params) {
    return this.pushReceiptTransaction(params);
  }

  /**
   * Queues a new redemption record for RealBooks API sync (Backwards compatibility)
   */
  static async queueRedemptionSync({ redemption, tenant_id, simulate_fail = false }) {
    const payload = {
      receipt_no: redemption.redemption_code,
      customer_id: redemption.customer_id,
      bill_amount: redemption.discount_amount_rupees || redemption.discount_amount,
      discount_amount: redemption.discount_amount_rupees || redemption.discount_amount,
      points_redeemed: redemption.points_redeemed,
      branch_id: redemption.branch_id,
      category: 'service',
      tenant_id,
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
      this.pushReceiptTransaction(payload).catch((err) =>
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
      receipt_no: log.redemption_code,
      entity_type: log.entity_type,
    };

    try {
      const response = await realbooksClient.pushRedemption(syncPayload);

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
   * 4. Connection & Configuration Status for RealBooks Integration
   */
  static async getConnectionStatus(tenantId = 'bellad_and_company') {
    const countRes = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE api_status = 'synced') AS synced_count,
         COUNT(*) FILTER (WHERE api_status = 'failed') AS failed_count,
         COUNT(*) FILTER (WHERE api_status = 'pending') AS pending_count,
         COUNT(*) AS total_count
       FROM realbooks_sync_log
       WHERE tenant_id = $1;`,
      [tenantId]
    );

    const recentLogs = await pool.query(
      `SELECT sync_id AS id, entity_type, entity_id, api_status, created_at
       FROM realbooks_sync_log
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 5;`,
      [tenantId]
    );

    return {
      mode: realbooksClient.mode, // 'test' (sandbox simulation) or 'live'
      is_test_mode: realbooksClient.mode !== 'live',
      base_url: realbooksClient.baseUrl,
      domain: realbooksClient.domain,
      cid: realbooksClient.cid,
      segid: realbooksClient.segid,
      email_id: realbooksClient.emailId,
      stats: {
        synced: parseInt(countRes.rows[0]?.synced_count || 0, 10),
        failed: parseInt(countRes.rows[0]?.failed_count || 0, 10),
        pending: parseInt(countRes.rows[0]?.pending_count || 0, 10),
        total: parseInt(countRes.rows[0]?.total_count || 0, 10),
      },
      recent_syncs: recentLogs.rows,
    };
  }

  /**
   * Background retry worker
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
