const PointsService = require('../services/points.service');

class PointsController {
  /**
   * Endpoint to record a points-earning transaction (sale or service)
   */
  static async earnPoints(req, res, next) {
    try {
      const { customer_id, vehicle_id, branch_id, amount, type, reference_id, description } = req.body;
      const tenantId = req.tenantId;
      const createdBy = req.user?.id || null;

      const result = await PointsService.recordEarning({
        customer_id,
        vehicle_id: vehicle_id ? parseInt(vehicle_id, 10) : null,
        branch_id,
        amount,
        type,
        reference_id,
        description,
        created_by: createdBy,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        message: `Successfully recorded ${type} points earning for customer ${customer_id}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async grantInhouseBonus(req, res, next) {
    try {
      const { customer_id, vehicle_id, branch_id, type, points, reference_id, description } = req.body;
      const tenantId = req.tenantId;
      const createdBy = req.user?.id || null;

      const result = await PointsService.grantFixedBonus({
        customer_id,
        vehicle_id: vehicle_id ? parseInt(vehicle_id, 10) : null,
        branch_id: branch_id || 1,
        points: parseInt(points, 10),
        category: 'service',
        type: 'earn_service',
        reference_id,
        description,
        created_by: createdBy,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        message: `Successfully granted In-house bonus for customer ${customer_id}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint to fetch a customer's full ledger history and current tier snapshot
   */
  static async getCustomerLedger(req, res, next) {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '20', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const data = await PointsService.getCustomerLedgerAndTier(customerId, tenantId, limit, offset);

      if (!data) {
        return res.status(404).json({
          status: 'fail',
          error: `Customer not found with customer_id: '${customerId}'`,
        });
      }

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PointsController;
