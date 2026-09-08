const RedemptionService = require('../services/redemption.service');

class RedemptionController {
  /**
   * Request OTP for customer redemption (6-digit, 10-min expiry, rate limited 5/hr)
   */
  static async requestOtp(req, res, next) {
    try {
      const { phone, customer_id } = req.body;
      const tenantId = req.tenantId;

      const result = await RedemptionService.requestOtp({
        phone,
        customer_id,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        message: `OTP sent successfully to ${result.phone_number}. Valid for 10 minutes.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cashier submits phone, OTP, points to redeem
   */
  static async redeemPoints(req, res, next) {
    try {
      const { phone, otp, points, branch_id, bypass_lock_in } = req.body;
      const tenantId = req.tenantId;
      const createdBy = req.user?.id || null;

      const result = await RedemptionService.redeemPoints({
        phone,
        otp,
        points,
        branch_id,
        created_by: createdBy,
        tenant_id: tenantId,
        bypass_lock_in: bypass_lock_in || false,
      });

      res.status(200).json({
        status: 'success',
        message: `Redemption successful. Discount of ₹${result.discount.rupees} applied.`,
        data: {
          redemption_code: result.redemption.redemption_code,
          discount_amount_rupees: result.discount.rupees,
          discount_amount_paise: result.discount.paise,
          points_redeemed: result.balance.points_redeemed,
          remaining_balance: result.balance.remaining_balance,
          redemption_details: result.redemption,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch redemption record by unique code
   */
  static async getRedemption(req, res, next) {
    try {
      const { code } = req.params;
      const tenantId = req.tenantId;

      const redemption = await RedemptionService.getRedemptionByCode(code, tenantId);

      if (!redemption) {
        return res.status(404).json({
          status: 'fail',
          error: `Redemption record not found for code: '${code}'`,
        });
      }

      res.status(200).json({
        status: 'success',
        data: redemption,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RedemptionController;
