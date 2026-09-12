const RedemptionService = require('../services/redemption.service');
const RedemptionEligibilityService = require('../services/redemption_eligibility.service');

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
   * Fetch 12/24-month redemption eligibility status for a vehicle
   */
  static async getVehicleRedemptionStatus(req, res, next) {
    try {
      const { vehicle_id } = req.params;
      const tenantId = req.tenantId;

      const status = await RedemptionEligibilityService.getVehicleRedemptionStatus(
        parseInt(vehicle_id, 10),
        tenantId
      );

      res.status(200).json({
        status: 'success',
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cashier submits phone/customer_id, OTP, bill_amount, category, receipt_no, account_ledger_no
   * NO branch dropdown — branch_id comes from logged-in cashier's session automatically.
   */
  static async redeemPoints(req, res, next) {
    try {
      const {
        phone,
        customer_id,
        otp,
        bill_amount,
        points,
        category,
        receipt_no,
        account_ledger_no,
        vehicle_id,
        referral_code,
      } = req.body;

      const tenantId = req.tenantId;
      const createdBy = req.user?.id || null;
      // branch_id comes from logged-in cashier's session automatically
      const branchId = req.user?.branch_id || req.body.branch_id || 1;

      const result = await RedemptionService.redeemPoints({
        phone,
        customer_id,
        otp,
        bill_amount: bill_amount ? parseFloat(bill_amount) : undefined,
        points: points ? parseInt(points, 10) : undefined,
        category: category || 'service',
        receipt_no: receipt_no ? receipt_no.trim() : null,
        account_ledger_no: account_ledger_no ? account_ledger_no.trim() : null,
        branch_id: branchId ? parseInt(branchId, 10) : null,
        vehicle_id: vehicle_id ? parseInt(vehicle_id, 10) : null,
        referral_code: referral_code ? referral_code.trim() : null,
        created_by: createdBy,
        tenant_id: tenantId,
      });

      const message = result.message || `Redemption processed successfully. Discount of ₹${result.discount_applied} applied.`;

      res.status(200).json({
        status: 'success',
        message,
        data: result,
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
