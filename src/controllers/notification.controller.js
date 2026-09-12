const NotificationService = require('../services/notification.service');
const { pool } = require('../config/db');

class NotificationController {
  /**
   * Manually sends a "points earned" WhatsApp message right now (no fire-and-forget queue).
   * Failures surface instantly as a 502 so the cashier can react immediately.
   */
  static async sendPointsEarnedNow(req, res, next) {
    try {
      const { customer_id, points, transaction_type } = req.body;

      const result = await NotificationService.sendPointsEarnedNotification({
        customer_id,
        points,
        transaction_type,
        tenant_id: req.tenantId,
      });

      if (!result.success) {
        return res.status(502).json({
          status: 'fail',
          error: result.error || result.reason || 'WhatsApp message failed to send.',
        });
      }

      res.status(200).json({
        status: 'success',
        message: `WhatsApp sent to ${result.to_phone}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually sends a "redemption confirmed" WhatsApp message right now (no fire-and-forget queue).
   */
  static async sendRedemptionNow(req, res, next) {
    try {
      const { customer_id, phone, pointsRedeemed, discountRupees, remainingBalance } = req.body;

      const result = await NotificationService.sendRedemptionNotification({
        customer_id,
        phone,
        pointsRedeemed,
        discountRupees,
        remainingBalance,
        tenant_id: req.tenantId,
      });

      if (!result.success) {
        return res.status(502).json({
          status: 'fail',
          error: result.error || result.reason || 'WhatsApp message failed to send.',
        });
      }

      res.status(200).json({
        status: 'success',
        message: `WhatsApp sent to ${result.to_phone}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recent WhatsApp dispatch attempts (tenant-scoped, newest first).
   * Powers the dashboard "Message Log" viewer.
   */
  static async getRecentLogs(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '20', 10);

      const result = await pool.query(
        `SELECT id, customer_id, phone_number, template_name, status, error_message, provider, created_at
         FROM whatsapp_message_log
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT $2;`,
        [tenantId, limit]
      );

      res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;