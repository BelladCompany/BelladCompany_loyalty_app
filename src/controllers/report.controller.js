const ReportService = require('../services/report.service');
const { scopeBranchAccess } = require('../middleware/roles');

class ReportController {
  /**
   * Helper to send JSON or CSV format response
   */
  static respond(res, data, reportName, isArrayData = true) {
    if (res.req.query.format === 'csv') {
      const csvData = isArrayData ? data : [data];
      const csvStr = ReportService.convertToCsv(csvData);
      const filename = `${reportName}_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvStr);
    }

    return res.status(200).json({
      status: 'success',
      data,
    });
  }

  /**
   * Points Summary Report (Issued vs Redeemed)
   */
  static async getPointsSummary(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { branchId } = scopeBranchAccess(req);
      const { brand_id, vehicle_type, category, start_date, end_date } = req.query;

      const data = await ReportService.getPointsSummaryReport({
        tenantId,
        branchId,
        brandId: brand_id ? parseInt(brand_id, 10) : null,
        vehicleType: vehicle_type,
        category,
        startDate: start_date,
        endDate: end_date,
      });

      return ReportController.respond(res, data, 'points_summary');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer Distribution Report (Branch x Model Pivot)
   */
  static async getCustomerDistribution(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { branchId } = scopeBranchAccess(req);
      const { brand_id, vehicle_type } = req.query;

      const data = await ReportService.getCustomerDistributionReport({
        tenantId,
        branchId,
        brandId: brand_id ? parseInt(brand_id, 10) : null,
        vehicleType: vehicle_type,
      });

      return ReportController.respond(res, data, 'customer_distribution');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Points Liability Report (Unredeemed Balance & Expiring Buckets)
   */
  static async getLiability(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { branchId } = scopeBranchAccess(req);

      const data = await ReportService.getPointsLiabilityReport({
        tenantId,
        branchId,
      });

      if (req.query.format === 'csv') {
        const flatLiability = [
          {
            Metric: 'Total Unredeemed Points',
            Value: data.total_unredeemed_points,
          },
          {
            Metric: 'Total Liability (₹)',
            Value: data.total_liability_rupees,
          },
          {
            Metric: 'Points Expiring in 30 Days',
            Value: data.expiring_risk_buckets.expiring_in_30_days.points,
          },
          {
            Metric: 'Points Expiring in 60 Days',
            Value: data.expiring_risk_buckets.expiring_in_60_days.points,
          },
          {
            Metric: 'Points Expiring in 90 Days',
            Value: data.expiring_risk_buckets.expiring_in_90_days.points,
          },
        ];
        return ReportController.respond(res, flatLiability, 'points_liability');
      }

      return res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Referral Conversion & Override Audit Report
   */
  static async getReferrals(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { start_date, end_date } = req.query;

      const data = await ReportService.getReferralConversionReport({
        tenantId,
        startDate: start_date,
        endDate: end_date,
      });

      if (req.query.format === 'csv') {
        return ReportController.respond(res, data.status_breakdown, 'referral_conversion');
      }

      return res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * KYC Change Audit Report (Request volume & cashier flags)
   */
  static async getKycAudit(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { branchId } = scopeBranchAccess(req);
      const { start_date, end_date } = req.query;

      const data = await ReportService.getKycAuditReport({
        tenantId,
        branchId,
        startDate: start_date,
        endDate: end_date,
      });

      return ReportController.respond(res, data, 'kyc_audit');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
