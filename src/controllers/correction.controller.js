const path = require('path');
const fs = require('fs');
const CorrectionService = require('../services/correction.service');

class CorrectionController {
  /**
   * Preview correction math diff before raising ticket (POST /api/corrections/preview)
   */
  static async previewCorrection(req, res, next) {
    try {
      const { points_ledger_reference, correct_bill_amount } = req.body;
      const tenantId = req.tenantId;

      const preview = await CorrectionService.previewCorrection({
        points_ledger_reference,
        correct_bill_amount,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cashier raises a new correction request (POST /api/corrections/raise)
   */
  static async raiseCorrection(req, res, next) {
    try {
      const {
        customer_id,
        points_ledger_reference,
        wrong_bill_amount,
        correct_bill_amount,
        explanation,
      } = req.body;

      const tenantId = req.tenantId;
      const cashierUserId = req.user?.id || req.user?.user_id || null;
      const branchId = req.user?.branch_id || req.body.branch_id || 1;

      let screenshotUrl = null;
      if (req.file) {
        screenshotUrl = `/uploads/correction_proofs/${req.file.filename}`;
      }

      const result = await CorrectionService.raiseCorrectionRequest({
        customer_id,
        points_ledger_reference,
        wrong_bill_amount,
        correct_bill_amount,
        explanation,
        screenshot_file_url: screenshotUrl,
        cashier_user_id: cashierUserId,
        branch_id: branchId,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Correction request submitted successfully and queued for admin review.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin queue to list correction requests (GET /api/admin/corrections)
   */
  static async listCorrections(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const status = req.query.status || 'pending';
      const userRole = req.user?.role;
      const userBranchId = req.user?.branch_id;

      const requests = await CorrectionService.listCorrectionRequests({
        tenant_id: tenantId,
        status,
        user_role: userRole,
        user_branch_id: userBranchId,
      });

      res.status(200).json({
        status: 'success',
        results: requests.length,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin approves correction request (POST /api/admin/corrections/:id/approve)
   */
  static async approveCorrection(req, res, next) {
    try {
      const requestId = parseInt(req.params.id, 10);
      const tenantId = req.tenantId;
      const reviewerUserId = req.user?.id || req.user?.user_id || null;
      const reviewerRole = req.user?.role;
      const reviewerBranchId = req.user?.branch_id;
      const { review_notes } = req.body;

      const result = await CorrectionService.approveCorrectionRequest({
        request_id: requestId,
        reviewer_user_id: reviewerUserId,
        reviewer_role: reviewerRole,
        reviewer_branch_id: reviewerBranchId,
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
   * Admin rejects correction request (POST /api/admin/corrections/:id/reject)
   */
  static async rejectCorrection(req, res, next) {
    try {
      const requestId = parseInt(req.params.id, 10);
      const tenantId = req.tenantId;
      const reviewerUserId = req.user?.id || req.user?.user_id || null;
      const reviewerRole = req.user?.role;
      const reviewerBranchId = req.user?.branch_id;
      const { review_notes } = req.body;

      const result = await CorrectionService.rejectCorrectionRequest({
        request_id: requestId,
        reviewer_user_id: reviewerUserId,
        reviewer_role: reviewerRole,
        reviewer_branch_id: reviewerBranchId,
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
   * Stream authenticated correction proof file (GET /api/corrections/proof/:filename)
   */
  static async streamCorrectionProof(req, res, next) {
    try {
      const { filename } = req.params;
      const tenantId = req.tenantId;

      if (!filename) {
        return res.status(400).json({ status: 'fail', error: 'Filename is required.' });
      }

      // Reject path traversal attacks
      const cleanFilename = path.basename(filename);
      if (cleanFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ status: 'fail', error: 'Invalid filename specified.' });
      }

      // Verify filename belongs to a real correction_requests row for this tenant
      const isValid = await CorrectionService.verifyProofFileAccess(cleanFilename, tenantId);
      if (!isValid) {
        return res.status(403).json({ status: 'fail', error: 'Access denied. Proof file not found or unauthorized.' });
      }

      const filePath = path.join(__dirname, '../../uploads/correction_proofs', cleanFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: 'fail', error: 'Proof file not found on disk.' });
      }

      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CorrectionController;
