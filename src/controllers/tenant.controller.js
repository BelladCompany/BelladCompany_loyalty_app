const TenantService = require('../services/tenant.service');

class TenantController {
  static async listFirms(req, res, next) {
    try {
      const firms = await TenantService.listFirms();
      res.status(200).json({
        status: 'success',
        data: firms,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createFirm(req, res, next) {
    try {
      const result = await TenantService.createFirm(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Client firm onboarded successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateFirm(req, res, next) {
    try {
      const { tenantId } = req.params;
      const result = await TenantService.updateFirm(tenantId, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Firm updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TenantController;
