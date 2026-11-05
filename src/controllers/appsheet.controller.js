const { pool } = require('../config/db');
const TransactionService = require('../services/transaction.service');
const AppSheetSyncEngine = require('../services/appsheetSyncEngine.service');

class AppSheetController {
  /**
   * Helper to normalize payload from AppSheet (supports root, Row, Rows, data)
   */
  static extractRow(body) {
    if (!body || typeof body !== 'object') return {};
    if (body.Row && typeof body.Row === 'object') return body.Row;
    if (Array.isArray(body.Rows) && body.Rows.length > 0) return body.Rows[0];
    if (body.data && typeof body.data === 'object') return body.data;
    return body;
  }

  /**
   * Dedicated receiving endpoint for AppSheet webhook triggers.
   * Handles both:
   *  1. PR Done Vehicle Sales Line Items (Automatic bidirectional sync + CRED-like postback)
   *  2. Service / Counter Transactions (Legacy backwards-compatible pipeline)
   * Route: POST /api/appsheet/webhook/transaction, POST /api/appsheet/webhook/line-item
   */
  static async handleTransactionWebhook(req, res) {
    const rawBody = req.body || {};
    const row = AppSheetController.extractRow(rawBody);

    const tenantId = req.headers['x-tenant-id'] || process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
    const rowId = row['Order Unique ID'] || row['DMS Booking ID'] || row['appsheet_row_id'] || row['reference_id'] || row['job_card_number'] || null;

    // Detect if this is an AppSheet vehicle order form line item
    const isVehicleOrder = Boolean(
      row['Order Unique ID'] ||
      row['Billing Status'] ||
      row['VIN Number'] ||
      row['Customer Name'] ||
      row['Ex-Showroom Price'] ||
      row['Net Ex-Showroom Price'] ||
      row['Total Vehicle Billing Amount']
    );

    if (isVehicleOrder) {
      try {
        console.log(`📡 [AppSheet Webhook Received] Incoming Order '${rowId}' (Status: ${row['Billing Status'] || row['Status']})`);

        const syncResult = await AppSheetSyncEngine.processSingleRow(row, tenantId);

        if (syncResult.status === 'skipped') {
          await AppSheetController.logWebhook({
            appsheet_row_id: rowId,
            payload: row,
            result: 'skipped',
            error_message: syncResult.reason,
            tenant_id: tenantId,
          });

          return res.status(200).json({
            status: 'skipped',
            reason: syncResult.reason,
            orderId: rowId,
          });
        }

        // Successfully credited
        await AppSheetController.logWebhook({
          appsheet_row_id: rowId,
          payload: row,
          result: 'success',
          error_message: null,
          tenant_id: tenantId,
        });

        return res.status(200).json({
          status: 'success',
          message: 'PR Done vehicle line item processed and credited in Bellad Loyalty.',
          order_id: syncResult.orderId,
          customer_id: syncResult.customerId,
          vehicle_id: syncResult.vehicleId,
          points_credited: syncResult.pointsCredited,
          passbook_balance: syncResult.newBalance,
          is_new_credit: syncResult.isNewCredit,
          date: syncResult.date,
        });
      } catch (orderErr) {
        const errorMsg = orderErr.message || 'Error processing AppSheet vehicle order item';
        await AppSheetController.logWebhook({
          appsheet_row_id: rowId,
          payload: row,
          result: 'error',
          error_message: errorMsg,
          tenant_id: tenantId,
        });

        return res.status(500).json({
          status: 'error',
          error: errorMsg,
          orderId: rowId,
        });
      }
    }

    // --- Legacy / Service Counter Transaction Webhook Pipeline ---
    const {
      category,
      job_card_number,
      reference_id,
      bill_amount,
      customer_phone,
      vehicle_registration,
      branch_code,
    } = row;

    try {
      let resolvedBranchId = 1;
      if (branch_code) {
        resolvedBranchId = await AppSheetSyncEngine.resolveBranchId(branch_code, tenantId);
      }

      const phoneInput = customer_phone ? String(customer_phone).trim() : '';
      if (!phoneInput) {
        const errMsg = 'Missing required customer_phone or customer identifier in webhook payload.';
        await AppSheetController.logWebhook({
          appsheet_row_id: rowId,
          payload: row,
          result: 'not_found',
          error_message: errMsg,
          tenant_id: tenantId,
        });
        return res.status(400).json({ status: 'fail', error: errMsg });
      }

      const phoneRes = await pool.query(
        `SELECT customer_id FROM customer_phones WHERE tenant_id = $1 AND phone_number = $2 LIMIT 1;`,
        [tenantId, phoneInput]
      );

      if (phoneRes.rows.length === 0) {
        const errMsg = `Customer with phone '${phoneInput}' not found in loyalty system.`;
        await AppSheetController.logWebhook({
          appsheet_row_id: rowId,
          payload: row,
          result: 'not_found',
          error_message: errMsg,
          tenant_id: tenantId,
        });
        return res.status(404).json({ status: 'fail', error: errMsg });
      }

      const resolvedCustomerId = phoneRes.rows[0].customer_id;

      let resolvedVehicleId = null;
      if (vehicle_registration) {
        const vehRes = await pool.query(
          `SELECT vehicle_id FROM vehicles WHERE tenant_id = $1 AND (chassis_no = $2 OR registration_number = $2) LIMIT 1;`,
          [tenantId, String(vehicle_registration).trim()]
        );
        if (vehRes.rows.length > 0) resolvedVehicleId = vehRes.rows[0].vehicle_id;
      }

      const result = await TransactionService.syncTransaction({
        category: category || 'service',
        job_card_number,
        reference_id,
        bill_amount,
        customer_id: resolvedCustomerId,
        phone_number: phoneInput,
        vehicle_id: resolvedVehicleId,
        registration_number: vehicle_registration,
        branch_id: resolvedBranchId,
        source: 'appsheet_bot',
        created_by: null,
        tenant_id: tenantId,
      });

      await AppSheetController.logWebhook({
        appsheet_row_id: rowId,
        payload: row,
        result: result.status === 'already_processed' ? 'duplicate' : 'success',
        error_message: null,
        tenant_id: tenantId,
      });

      return res.status(200).json({
        status: 'success',
        message: result.message,
        transaction: result.transaction,
        ledger_entry: result.ledger_entry,
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      const errorMsg = err.message || 'AppSheet transaction webhook processing failed.';

      await AppSheetController.logWebhook({
        appsheet_row_id: rowId,
        payload: row,
        result: 'error',
        error_message: errorMsg,
        tenant_id: tenantId,
      });

      return res.status(statusCode).json({ status: 'fail', error: errorMsg });
    }
  }

  /**
   * Dedicated endpoint strictly for PR Done vehicle webhooks.
   * Route: POST /api/appsheet/webhook/pr-done
   */
  static async handlePrDoneWebhook(req, res) {
    return AppSheetController.handleTransactionWebhook(req, res);
  }

  /**
   * On-demand batch sync from AppSheet Cloud API (April 01, 2026 to Till Date)
   * Route: POST /api/appsheet/sync-pr-done
   */
  static async syncPrDone(req, res) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
    try {
      const summary = await AppSheetSyncEngine.syncAllPrDoneFromCutoff(tenantId);
      return res.status(200).json({
        success: true,
        message: 'AppSheet PR Done sync completed successfully.',
        cutoff_date: '2026-04-01',
        summary,
      });
    } catch (err) {
      console.error('[AppSheet Sync PR Done Error]:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Batch sync from AppSheet failed.',
      });
    }
  }

  /**
   * Get sync status and recent log entries
   * Route: GET /api/appsheet/sync-status
   */
  static async getSyncStatus(req, res) {
    const tenantId = req.headers['x-tenant-id'] || process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
    try {
      const [pullLogsRes, webhookLogsRes, statsRes] = await Promise.all([
        pool.query(
          `SELECT * FROM appsheet_pull_log WHERE tenant_id = $1 ORDER BY log_id DESC LIMIT 10;`,
          [tenantId]
        ),
        pool.query(
          `SELECT id, appsheet_row_id, result, error_message, received_at 
           FROM appsheet_webhook_log WHERE tenant_id = $1 ORDER BY id DESC LIMIT 15;`,
          [tenantId]
        ),
        pool.query(`
          SELECT 
            (SELECT count(*) FROM customers WHERE tenant_id = $1) as total_customers,
            (SELECT count(*) FROM vehicles WHERE tenant_id = $1 AND purchase_date >= '2026-04-01') as pr_done_vehicles_fy26,
            (SELECT coalesce(sum(points), 0) FROM points_ledger WHERE tenant_id = $1 AND type = 'earn_sale') as total_sales_points
        `, [tenantId]),
      ]);

      return res.status(200).json({
        success: true,
        stats: statsRes.rows[0],
        recent_pull_logs: pullLogsRes.rows,
        recent_webhook_logs: webhookLogsRes.rows,
        cutoff_date: '2026-04-01',
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Writes a log entry to appsheet_webhook_log table
   */
  static async logWebhook({ appsheet_row_id, payload, result, error_message, tenant_id }) {
    try {
      await pool.query(
        `INSERT INTO appsheet_webhook_log (appsheet_row_id, payload, result, error_message, tenant_id)
         VALUES ($1, $2, $3, $4, $5);`,
        [appsheet_row_id || null, payload || {}, result, error_message || null, tenant_id || 'bellad_and_company']
      );
    } catch (logErr) {
      console.error('[AppSheet Webhook Logging Failed]', logErr.message || logErr);
    }
  }
}

module.exports = AppSheetController;
