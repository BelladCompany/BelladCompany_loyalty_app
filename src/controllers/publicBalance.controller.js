const PublicBalanceService = require('../services/publicBalance.service');

class PublicBalanceController {
  /**
   * Unauthenticated endpoint: GET /api/public/balance/:token
   */
  static async getPublicBalance(req, res, next) {
    try {
      const { token } = req.params;
      const data = await PublicBalanceService.getPublicBalanceByToken(token);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          status: 'fail',
          error: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Protected endpoint: POST /api/customers/:id/public-token/revoke
   */
  static async revokePublicToken(req, res, next) {
    try {
      const customerId = req.params.id;
      const tenantId = req.tenantId || 'bellad_and_company';
      const result = await PublicBalanceService.revokeToken(customerId, tenantId);
      res.status(200).json({
        status: 'success',
        message: `Successfully revoked ${result.revokedCount} public balance token(s) for customer '${customerId}'.`,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          status: 'fail',
          error: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Protected endpoint: POST /api/customers/:id/public-token/regenerate
   */
  static async regeneratePublicToken(req, res, next) {
    try {
      const customerId = req.params.id;
      const tenantId = req.tenantId || 'bellad_and_company';
      const newToken = await PublicBalanceService.regenerateToken(customerId, tenantId);
      res.status(200).json({
        status: 'success',
        message: `Successfully regenerated public balance token for customer '${customerId}'.`,
        token: newToken,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          status: 'fail',
          error: error.message,
        });
      }
      next(error);
    }
  }
}

module.exports = PublicBalanceController;
