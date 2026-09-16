const { pool } = require('../config/db');
const MergeService = require('../services/merge.service');
const RealBooksService = require('../services/realbooks/realbooks.service');

class AdminController {
  /**
   * Get duplicate candidate customer pairs queue
   */
  static async getDuplicateQueue(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const candidates = await MergeService.detectDuplicates(tenantId);

      res.status(200).json({
        status: 'success',
        count: candidates.length,
        data: candidates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve and execute customer merge
   */
  static async approveMerge(req, res, next) {
    try {
      const { surviving_customer_id, merged_customer_id, reason } = req.body;
      const tenantId = req.tenantId;
      const adminUserId = req.user.id;

      const result = await MergeService.executeMerge({
        surviving_customer_id,
        merged_customer_id,
        reason,
        admin_user_id: adminUserId,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        message: `Customer ${merged_customer_id} successfully merged into ${surviving_customer_id}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List customer merge audit logs
   */
  static async getMergeLogs(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const logs = await MergeService.listMergeLogs(tenantId, limit, offset);

      res.status(200).json({
        status: 'success',
        results: logs.length,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * View RealBooks sync failures
   */
  static async getRealBooksSyncFailures(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const failures = await RealBooksService.getSyncFailures(tenantId, limit, offset);

      res.status(200).json({
        status: 'success',
        count: failures.length,
        data: failures,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger retry for a failed RealBooks sync log
   */
  static async retryRealBooksSync(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const result = await RealBooksService.manuallyRetrySync(id, tenantId);

      res.status(200).json({
        status: 'success',
        message: `RealBooks sync log '${id}' retry initiated.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List WhatsApp delivery audit logs
   */
  static async getWhatsAppLogs(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);
      const status = req.query.status;

      let query = `
        SELECT id, customer_id, phone_number, template_name, message_body,
               status, error_message, provider, tenant_id, created_at
        FROM whatsapp_message_log
        WHERE tenant_id = $1
      `;
      const params = [tenantId];
      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
      params.push(limit, offset);

      const logsRes = await pool.query(query, params);
      res.status(200).json({
        status: 'success',
        results: logsRes.rows.length,
        data: logsRes.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List last 50 AppSheet webhook transaction log entries with status
   */
  static async getAppSheetWebhookLogs(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const logsRes = await pool.query(
        `SELECT id, appsheet_row_id, payload, result, error_message, tenant_id, received_at
         FROM appsheet_webhook_log
         WHERE tenant_id = $1
         ORDER BY received_at DESC
         LIMIT $2 OFFSET $3;`,
        [tenantId, limit, offset]
      );

      res.status(200).json({
        status: 'success',
        results: logsRes.rows.length,
        data: logsRes.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List Google Sheets auto-sync logs
   */
  static async getGoogleSheetsLogs(req, res, next) {
    try {
      const GoogleSheetsService = require('../services/googleSheets.service');
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const logs = await GoogleSheetsService.getSyncLogs(tenantId, limit, offset);

      res.status(200).json({
        status: 'success',
        results: logs.length,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;

