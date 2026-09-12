const TransactionService = require('../services/transaction.service');

class TransactionController {
  /**
   * Endpoint to sync transactions (POST /api/transactions/sync)
   * Called by DMS/RealBooks integration or manual-entry fallback screen.
   * Idempotent: Returns existing transaction without double-crediting if reference_id/job_card_number is repeated.
   */
  static async syncTransaction(req, res, next) {
    try {
      const {
        category,
        job_card_number,
        reference_id,
        bill_amount,
        customer_id,
        phone_number,
        vehicle_id,
        registration_number,
        branch_id,
        source,
      } = req.body;

      const tenantId = req.tenantId;
      const createdBy = req.user?.id || null;

      const result = await TransactionService.syncTransaction({
        category,
        job_card_number,
        reference_id,
        bill_amount,
        customer_id,
        phone_number,
        vehicle_id,
        registration_number,
        branch_id: branch_id ? parseInt(branch_id, 10) : 1,
        source: source || 'manual',
        created_by: createdBy,
        tenant_id: tenantId,
      });

      const statusCode = result.status === 'already_processed' ? 200 : 201;

      res.status(statusCode).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint to check if a transaction exists by job card / reference ID (GET /api/transactions/lookup)
   */
  static async lookupTransaction(req, res, next) {
    try {
      const { category, identifier, branch_id } = req.query;
      const tenantId = req.tenantId;

      if (!identifier) {
        return res.status(400).json({
          status: 'fail',
          error: 'Identifier (job_card_number or reference_id) is required for lookup.',
        });
      }

      const branchId = branch_id ? parseInt(branch_id, 10) : 1;
      const existing = await TransactionService.findTransaction(category, identifier, branchId, tenantId);

      if (!existing) {
        return res.status(404).json({
          status: 'fail',
          message: `Transaction '${identifier}' not found for tenant '${tenantId}'.`,
        });
      }

      res.status(200).json({
        status: 'success',
        data: existing,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TransactionController;
