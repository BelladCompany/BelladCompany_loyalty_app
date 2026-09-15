const ReferralService = require('../services/referral.service');

class ReferralController {
  /**
   * Registers a new referral between two distinct customers (pending, 0 points)
   */
  static async registerReferral(req, res, next) {
    try {
      const { referrer_customer_id, referred_customer_id } = req.body;
      const tenantId = req.tenantId;

      const referral = await ReferralService.registerReferral({
        referrer_customer_id,
        referred_customer_id,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Referral registered successfully in pending status.',
        data: referral,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin-only endpoint to approve a referral with points and mandatory reason
   */
  static async approveReferral(req, res, next) {
    try {
      const { id } = req.params;
      const { points, reason, approver_id } = req.body;
      const tenantId = req.tenantId;
      const currentUserId = req.user.id;

      const result = await ReferralService.approveReferral({
        referral_id: parseInt(id, 10),
        points,
        reason,
        current_user_id: currentUserId,
        approver_id: approver_id || null,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        message: `Referral ${id} approved successfully and points awarded to referrer.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists referrals with optional filters
   */
  static async listReferrals(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const { status, customer_id, limit, offset } = req.query;

      const referrals = await ReferralService.listReferrals({
        tenant_id: tenantId,
        status,
        customer_id,
        limit: parseInt(limit || '20', 10),
        offset: parseInt(offset || '0', 10),
      });

      res.status(200).json({
        status: 'success',
        results: referrals.length,
        data: referrals,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists authorized referral approvers (Admin only)
   */
  static async listApprovers(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const approvers = await ReferralService.listApprovers(tenantId);

      res.status(200).json({
        status: 'success',
        results: approvers.length,
        data: approvers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adds an authorized referral approver (Admin only)
   */
  static async addApprover(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const { user_id, name } = req.body;

      const approver = await ReferralService.addApprover({
        user_id,
        name,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Referral approver added successfully.',
        data: approver,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin list referral leads pipeline
   */
  static async getReferralLeadsPipeline(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const { status, search } = req.query;

      const leads = await ReferralService.getReferralLeadsPipeline({
        tenant_id: tenantId,
        status,
        search,
      });

      res.status(200).json({
        status: 'success',
        results: leads.length,
        data: leads,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin confirm RC completion and credit points for a lead
   */
  static async confirmRcCompletion(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const adminUserId = req.user ? req.user.id : 'ADMIN';

      const result = await ReferralService.confirmRcCompletionAndCredit({
        lead_id: parseInt(id, 10),
        admin_user_id: adminUserId,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        message: 'RC completion confirmed and referral points credited successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send WhatsApp Referral Link Reminder to customer using template `loyalty_refferral_progrm_reminder`
   */
  static async sendReferralReminder(req, res, next) {
    try {
      const { customer_id, phone } = req.body;
      const tenantId = req.tenantId;

      if (!customer_id) {
        return res.status(400).json({ status: 'fail', message: 'customer_id is required.' });
      }

      const NotificationService = require('../services/notification.service');
      // Use the real frontend origin the user is calling from (works across ports
      // 3000/3001/3002), falling back to FRONTEND_URL env, then a dev default.
      const frontendBase = (req.headers.origin !== 'null' && req.headers.origin)
        || process.env.FRONTEND_URL
        || 'http://localhost:5173';
      const result = await NotificationService.sendReferralReminderNotification({
        customer_id,
        phone,
        tenant_id: tenantId,
        frontendBase,
      });

      if (!result.success) {
        let errDetails = result.error || result.reason || 'Failed to send WhatsApp message';
        if (typeof errDetails === 'string' && errDetails.includes('NOT_FOUND')) {
          errDetails = 'Template not found in Reltigrow Dashboard. Please verify template name in Reltigrow or set RELTIGROW_REFERRAL_TEMPLATE in .env';
        }
        return res.status(400).json({
          status: 'fail',
          message: `WhatsApp send failed: ${errDetails}`,
          data: result,
        });
      }

      res.status(200).json({
        status: 'success',
        message: `Referral WhatsApp link reminder sent to customer ${customer_id}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReferralController;
