const KycService = require('../services/kyc.service');

class KycController {
  /**
   * Endpoint to submit a KYC Phone Update request (POST /api/customers/:id/kyc-change)
   */
  static async submitChange(req, res, next) {
    try {
      const customerId = req.params.id;
      const { change_type, new_value, reason, id_proof_type, otp } = req.body;
      const tenantId = req.tenantId;
      const requestedBy = req.user?.id || null;

      let fileUrl = null;
      if (req.file) {
        fileUrl = `/uploads/kyc_proofs/${req.file.filename}`;
      }

      const result = await KycService.submitChangeRequest({
        customer_id: customerId,
        change_type: change_type || 'phone_update',
        new_value,
        reason,
        id_proof_type,
        id_proof_file_url: fileUrl,
        otp,
        requested_by: requestedBy,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint to fetch pending KYC requests queue (GET /api/admin/kyc-change/pending)
   */
  static async getPendingRequests(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const requests = await KycService.getPendingRequests(tenantId);
      res.status(200).json({
        status: 'success',
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint to approve a KYC request (POST /api/admin/kyc-change/:id/approve)
   */
  static async approveRequest(req, res, next) {
    try {
      const requestId = parseInt(req.params.id, 10);
      const tenantId = req.tenantId;
      const reviewerUserId = req.user?.id;
      const reviewerRole = req.user?.role;
      const { review_notes } = req.body;

      const result = await KycService.approveRequest({
        requestId,
        reviewer_user_id: reviewerUserId,
        reviewer_role: reviewerRole,
        review_notes,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint to reject a KYC request (POST /api/admin/kyc-change/:id/reject)
   */
  static async rejectRequest(req, res, next) {
    try {
      const requestId = parseInt(req.params.id, 10);
      const tenantId = req.tenantId;
      const reviewerUserId = req.user?.id;
      const reviewerRole = req.user?.role;
      const { review_notes } = req.body;

      const result = await KycService.rejectRequest({
        requestId,
        reviewer_user_id: reviewerUserId,
        reviewer_role: reviewerRole,
        review_notes,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = KycController;
