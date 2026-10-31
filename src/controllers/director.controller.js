const DirectorService = require('../services/director.service');
const ReportService = require('../services/report.service');

class DirectorController {
  /**
   * GET /api/director/overview
   */
  static async getOverview(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const { start_date, end_date } = req.query;

      const data = await DirectorService.getOverview({
        tenantId,
        startDate: start_date,
        endDate: end_date,
      });

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/director/records
   */
  static async getRecords(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const {
        search,
        branch_id,
        category,
        type,
        start_date,
        end_date,
        limit = 50,
        offset = 0,
        format,
      } = req.query;

      const result = await DirectorService.getRecords({
        tenantId,
        search,
        branchId: branch_id,
        category,
        type,
        startDate: start_date,
        endDate: end_date,
        limit: Math.min(parseInt(limit, 10) || 50, 500),
        offset: parseInt(offset, 10) || 0,
      });

      if (format === 'csv') {
        const flatCsv = result.records.map((r) => ({
          Entry_ID: r.entry_id,
          Date: new Date(r.date).toLocaleString('en-IN'),
          Customer_ID: r.customer_id,
          Customer_Name: r.customer_name,
          Customer_Phone: r.customer_phone,
          Customer_Tier: r.customer_tier,
          Branch: r.branch_name,
          City: r.branch_city,
          Vehicle_Reg: r.registration_no,
          Vehicle_Model: r.vehicle_model,
          Category: r.category,
          Type: r.type,
          Points: r.points_formatted,
          Value_INR: r.equivalent_inr,
          Bill_Amount: r.bill_amount,
          Receipt_Invoice_No: r.receipt_no,
          Reason: r.reason_text,
        }));

        const csvStr = ReportService.convertToCsv(flatCsv);
        const filename = `Bellad_Director_Audit_Records_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csvStr);
      }

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DirectorController;

