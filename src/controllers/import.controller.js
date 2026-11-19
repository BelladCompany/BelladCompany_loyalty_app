const fs = require('fs');
const ExcelOrderImportService = require('../services/excelOrderImport.service');

class ImportController {
  /**
   * Inspect an uploaded workbook (.xlsx, .xls, .csv)
   * Returns sheet names, detected Order Form tab, columns, and previews.
   */
  static async inspect(req, res, next) {
    const tempPath = req.file?.path;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please upload a .xlsx, .xls, or .csv file.' });
      }

      // Allow plenty of time for inspection of large files
      req.setTimeout?.(300000); // 5 minutes
      res.setTimeout?.(300000);

      const fileTarget = req.file.path || req.file.buffer;
      const result = ExcelOrderImportService.inspectWorkbook(fileTarget);
      return res.status(200).json({
        success: true,
        ...result,
        filename: req.file.originalname,
        filesize: req.file.size
      });
    } catch (err) {
      console.error('[ImportController.inspect Error]', err);
      return res.status(500).json({
        error: 'Failed to inspect workbook: ' + err.message
      });
    } finally {
      if (tempPath && fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (e) {}
      }
    }
  }

  /**
   * Execute Order Form Import from chosen sheet
   */
  static async importOrders(req, res, next) {
    const tempPath = req.file?.path;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      // Increase request timeout for large batches (up to 33,000+ rows)
      req.setTimeout?.(600000); // 10 minutes
      res.setTimeout?.(600000);

      const sheetName = req.body.sheetName || undefined;
      const allowHistorical = req.body.allowHistorical === 'false' || req.body.allowHistorical === false ? false : true;
      const updateAadhaarAndDateOnly = req.body.updateAadhaarAndDateOnly === 'true' ||
                                      req.body.updateAadhaarAndDateOnly === true ||
                                      req.body.updateAadhaarOnly === 'true' ||
                                      req.body.updateAadhaarOnly === true;
      const customCutoffDate = req.body.customCutoffDate || '2020-01-01';
      const tenantId = req.headers['x-tenant-id'] || process.env.DEFAULT_TENANT_ID || 'bellad_and_company';

      const fileTarget = req.file.path || req.file.buffer;
      const summary = await ExcelOrderImportService.importOrders(fileTarget, {
        sheetName,
        allowHistorical,
        customCutoffDate,
        tenantId,
        updateAadhaarAndDateOnly
      });

      const message = updateAadhaarAndDateOnly
        ? `Successfully synced Aadhaar & DMS Date for ${summary.imported} customers (${summary.skipped} skipped, 0 points created)`
        : `Successfully processed ${summary.processed} rows (${summary.imported} imported, ${summary.skipped} skipped)`;

      return res.status(200).json({
        success: true,
        message,
        summary
      });
    } catch (err) {
      console.error('[ImportController.importOrders Error]', err);
      return res.status(500).json({
        error: 'Failed to import orders: ' + err.message
      });
    } finally {
      if (tempPath && fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (e) {}
      }
    }
  }
}

module.exports = ImportController;
