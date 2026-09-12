const { pool } = require('../config/db');
const TransactionService = require('../services/transaction.service');

class AppSheetController {
  /**
   * Dedicated receiving endpoint for AppSheet billing data webhook.
   * Route: POST /api/appsheet/webhook/transaction
   */
  static async handleTransactionWebhook(req, res) {
    const payload = req.body || {};
    const {
      category,
      job_card_number,
      reference_id,
      bill_amount,
      customer_phone,
      vehicle_registration,
      branch_code,
      brand_code,
      appsheet_row_id,
    } = payload;

    const tenantId = req.headers['x-tenant-id'] || process.env.DEFAULT_TENANT_ID || 'BAC-MAIN';
    const rowId = appsheet_row_id || reference_id || job_card_number || null;

    try {
      // 1. Resolve branch_id from branch_code if provided
      let resolvedBranchId = 1;
      if (branch_code) {
        const branchRes = await pool.query(
          `SELECT branch_id FROM branches
           WHERE tenant_id = $1 AND (branch_id::text = $2 OR branch_name ILIKE $2 OR branch_city ILIKE $2)
           LIMIT 1;`,
          [tenantId, String(branch_code).trim()]
        );
        if (branchRes.rows.length > 0) {
          resolvedBranchId = branchRes.rows[0].branch_id;
        } else {
          // Fallback to first available branch if branch_code could not be directly matched
          const firstBranchRes = await pool.query(
            `SELECT branch_id FROM branches WHERE tenant_id = $1 ORDER BY branch_id ASC LIMIT 1;`,
            [tenantId]
          );
          if (firstBranchRes.rows.length > 0) {
            resolvedBranchId = firstBranchRes.rows[0].branch_id;
          }
        }
      }

      // 2. Look up customer by phone number — EXACT match only
      const phoneInput = customer_phone ? String(customer_phone).trim() : '';
      if (!phoneInput) {
        const errMsg = 'Missing required customer_phone in webhook payload.';
        await AppSheetController.logWebhook({
          appsheet_row_id: rowId,
          payload,
          result: 'not_found',
          error_message: errMsg,
          tenant_id: tenantId,
        });
        return res.status(404).json({
          status: 'fail',
          error: errMsg,
        });
      }

      const phoneRes = await pool.query(
        `SELECT customer_id FROM customer_phones WHERE tenant_id = $1 AND phone_number = $2 LIMIT 1;`,
        [tenantId, phoneInput]
      );

      if (phoneRes.rows.length === 0) {
        const errMsg = `Customer with phone '${phoneInput}' not found in loyalty system. Please register customer profile first.`;
        await AppSheetController.logWebhook({
          appsheet_row_id: rowId,
          payload,
          result: 'not_found',
          error_message: errMsg,
          tenant_id: tenantId,
        });
        return res.status(404).json({
          status: 'fail',
          error: errMsg,
        });
      }

      const resolvedCustomerId = phoneRes.rows[0].customer_id;

      // 3. Look up vehicle by vehicle_registration if provided
      let resolvedVehicleId = null;
      if (vehicle_registration) {
        const regInput = String(vehicle_registration).trim();
        const vehRes = await pool.query(
          `SELECT vehicle_id FROM vehicles WHERE tenant_id = $1 AND chassis_no = $2 LIMIT 1;`,
          [tenantId, regInput]
        );
        if (vehRes.rows.length > 0) {
          resolvedVehicleId = vehRes.rows[0].vehicle_id;
        }
      }

      // 4. Sync transaction idempotently via TransactionService
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

      if (result.status === 'already_processed') {
        await AppSheetController.logWebhook({
          appsheet_row_id: rowId,
          payload,
          result: 'duplicate',
          error_message: null,
          tenant_id: tenantId,
        });

        return res.status(200).json({
          status: 'success',
          message: result.message,
          duplicate: true,
          transaction: result.transaction,
        });
      }

      // Successful sync
      await AppSheetController.logWebhook({
        appsheet_row_id: rowId,
        payload,
        result: 'success',
        error_message: null,
        tenant_id: tenantId,
      });

      return res.status(200).json({
        status: 'success',
        message: result.message,
        transaction: result.transaction,
        ledger_entry: result.ledger_entry,
        tier_snapshot: result.tier_snapshot,
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      const errorMsg = err.message || 'AppSheet transaction webhook processing failed.';

      await AppSheetController.logWebhook({
        appsheet_row_id: rowId,
        payload,
        result: 'error',
        error_message: errorMsg,
        tenant_id: tenantId,
      });

      return res.status(statusCode).json({
        status: 'fail',
        error: errorMsg,
      });
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
        [appsheet_row_id || null, payload || {}, result, error_message || null, tenant_id || 'BAC-MAIN']
      );
    } catch (logErr) {
      console.error('[AppSheet Webhook Logging Failed]', logErr.message || logErr);
    }
  }
}

module.exports = AppSheetController;
