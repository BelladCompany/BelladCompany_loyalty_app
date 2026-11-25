// src/controllers/invoiceV2.controller.js
// V2 Dealership Invoice OCR & Spare Parts Controller
// Handles invoice PDF parsing, preview, and persistence to database & spare parts catalog.

const fs = require('fs');
const path = require('path');
const invoiceParserService = require('../services/invoiceParserV2.service');

/**
 * POST /api/v2/invoices/parse
 * Uploads an invoice PDF, parses text and line items, returns preview.
 * If query `save=true` is set, also saves immediately to the database.
 */
async function parseInvoice(req, res, next) {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({
        status: 'fail',
        error: 'No invoice PDF file uploaded. Please upload a PDF file with field name "invoice_pdf".',
      });
    }

    const originalFilename = file.originalname || 'dealership_invoice.pdf';
    const parsedData = await invoiceParserService.parseInvoicePdf(file.buffer, originalFilename);

    // If caller requests instant persistence
    const shouldSave = req.query.save === 'true' || req.body.save === 'true' || req.body.save === true;
    let savedResult = null;

    if (shouldSave) {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const userId = req.user?.id || req.user?.user_id || null;
      const branchId = req.body.branchId || req.user?.branch_id || null;
      const customerId = req.body.customerId || null;
      const vehicleId = req.body.vehicleId || null;

      savedResult = await invoiceParserService.saveInvoiceAndCatalog(parsedData, {
        tenantId,
        userId,
        branchId,
        customerId,
        vehicleId,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        ...parsedData,
        saved: shouldSave,
        invoice_record_id: savedResult?.invoice?.id || null,
      },
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] parseInvoice error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to parse invoice PDF.',
    });
  }
}

/**
 * POST /api/v2/invoices/save
 * Explicitly saves a pre-parsed invoice and updates the spare parts catalog.
 */
async function saveInvoice(req, res, next) {
  try {
    const { invoiceData, branchId, customerId, vehicleId } = req.body;
    if (!invoiceData || !invoiceData.invoice_number) {
      return res.status(400).json({
        status: 'fail',
        error: 'Valid invoiceData with invoice_number is required.',
      });
    }

    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const userId = req.user?.id || req.user?.user_id || null;

    const result = await invoiceParserService.saveInvoiceAndCatalog(invoiceData, {
      tenantId,
      userId,
      branchId: branchId || req.user?.branch_id || null,
      customerId,
      vehicleId,
    });

    return res.status(201).json({
      status: 'success',
      message: `Invoice ${invoiceData.invoice_number} saved with ${result.savedPartsCount} parts and ${result.savedLabourCount} labour operations.`,
      data: result,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] saveInvoice error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to save invoice.',
    });
  }
}

/**
 * GET /api/v2/invoices
 * Lists invoice records with search and pagination.
 */
async function listInvoices(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const { brand, search, limit, offset } = req.query;

    const invoices = await invoiceParserService.listInvoices({
      tenantId,
      brand,
      search,
      limit,
      offset,
    });

    return res.status(200).json({
      status: 'success',
      count: invoices.length,
      data: invoices,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] listInvoices error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to list invoices.',
    });
  }
}

/**
 * GET /api/v2/invoices/:id
 * Fetches single invoice header with line items.
 */
async function getInvoiceDetails(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const invoiceId = parseInt(req.params.id, 10);

    if (isNaN(invoiceId)) {
      return res.status(400).json({
        status: 'fail',
        error: 'Invalid invoice ID.',
      });
    }

    const invoice = await invoiceParserService.getInvoiceDetails(invoiceId, tenantId);
    if (!invoice) {
      return res.status(404).json({
        status: 'fail',
        error: `Invoice ID ${invoiceId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: invoice,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] getInvoiceDetails error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to fetch invoice details.',
    });
  }
}

/**
 * GET /api/v2/invoices/spare-parts/search
 * Searches master catalog with price history.
 */
async function searchSpareParts(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const { q, brand, limit, offset } = req.query;

    const parts = await invoiceParserService.searchSparePartsCatalog(q, {
      tenantId,
      brand,
      limit,
      offset,
    });

    return res.status(200).json({
      status: 'success',
      count: parts.length,
      data: parts,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] searchSpareParts error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to search spare parts catalog.',
    });
  }
}

/**
 * GET /api/v2/invoices/customers/:customerId/parts
 * Fetches all spare parts & labour history recorded for a particular customer.
 */
async function getCustomerSpareParts(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const customerId = req.params.customerId;
    const { itemType, limit, offset } = req.query;

    if (!customerId) {
      return res.status(400).json({
        status: 'fail',
        error: 'Customer ID is required.',
      });
    }

    const parts = await invoiceParserService.getCustomerSparePartsHistory(customerId, {
      tenantId,
      itemType,
      limit,
      offset,
    });

    return res.status(200).json({
      status: 'success',
      customer_id: customerId,
      count: parts.length,
      data: parts,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] getCustomerSpareParts error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to fetch customer spare parts history.',
    });
  }
}

/**
 * POST /api/v2/invoices/advisor-upload
 * Uploads single or bulk invoice PDFs from an advisor or cashier, saves to backend storage,
 * executes OCR parsing, and creates pending records in advisor_invoice_queue.
 */
async function advisorUpload(req, res, next) {
  try {
    const files = req.uploadedFiles && req.uploadedFiles.length > 0
      ? req.uploadedFiles
      : req.file
      ? [req.file]
      : [];

    if (files.length === 0) {
      return res.status(400).json({
        status: 'fail',
        error: 'No invoice PDF file uploaded. Please upload a PDF file with field name "invoice_pdf" or "invoice_pdfs".',
      });
    }

    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const userId = req.user?.id || req.user?.user_id || null;
    const username = req.user?.username || 'advisor';
    const { customerId, vehicleId, autoSave } = req.body;

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        if (!file.buffer) continue;
        const result = await invoiceParserService.addToAdvisorQueue({
          buffer: file.buffer,
          originalFilename: file.originalname || 'advisor_invoice.pdf',
          tenantId,
          userId,
          username,
          customerId: customerId || null,
          vehicleId: vehicleId ? parseInt(vehicleId, 10) : null,
          autoSave: autoSave === 'true' || autoSave === true,
        });
        results.push(result);
      } catch (fileErr) {
        console.error(`[InvoiceV2Controller] Error uploading ${file.originalname}:`, fileErr);
        errors.push({ filename: file.originalname, error: fileErr.message });
      }
    }

    return res.status(201).json({
      status: 'success',
      message: `${results.length} invoice PDF(s) successfully uploaded to backend queue.`,
      uploaded_count: results.length,
      errors: errors.length > 0 ? errors : undefined,
      data: results.length === 1 ? results[0] : results,
      items: results,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] advisorUpload error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to upload invoice(s) to advisor queue.',
    });
  }
}

/**
 * GET /api/v2/invoices/advisor-queue
 * Lists invoices in the advisor queue (grouped day-wise on client, filterable by status/date).
 */
async function getAdvisorQueue(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const { status, search, date, customerId, limit, offset } = req.query;

    const items = await invoiceParserService.getAdvisorQueue({
      tenantId,
      status: status || null,
      search: search || null,
      date: date || null,
      customerId: customerId || null,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return res.status(200).json({
      status: 'success',
      count: items.length,
      data: items,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] getAdvisorQueue error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to fetch advisor invoice queue.',
    });
  }
}

/**
 * GET /api/v2/invoices/advisor-queue/:id
 * Fetches a single advisor invoice queue item.
 */
async function getAdvisorQueueItem(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const queueId = req.params.id;

    const item = await invoiceParserService.getAdvisorQueueItem(queueId, tenantId);
    if (!item) {
      return res.status(404).json({
        status: 'fail',
        error: 'Invoice queue record not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: item,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] getAdvisorQueueItem error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to fetch invoice queue item.',
    });
  }
}

/**
 * GET /api/v2/invoices/advisor-queue/:id/pdf
 * Streams the raw PDF file from disk for browser viewing.
 */
async function getAdvisorQueuePdf(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const queueId = req.params.id;
    const item = await invoiceParserService.getAdvisorQueueItem(queueId, tenantId);

    if (!item) {
      return res.status(404).json({
        status: 'fail',
        error: 'Invoice queue record not found.',
      });
    }

    const fullPath = path.resolve(__dirname, '../../', item.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        status: 'fail',
        error: 'Physical PDF invoice file not found on disk.',
      });
    }

    const safeFilename = (item.original_filename || 'invoice.pdf').replace(/["\r\n]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    const stream = fs.createReadStream(fullPath);
    return stream.pipe(res);
  } catch (err) {
    console.error('[InvoiceV2Controller] getAdvisorQueuePdf error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to stream invoice PDF.',
    });
  }
}

/**
 * PATCH /api/v2/invoices/advisor-queue/:id/status
 * Updates status of a queue record (e.g. to 'completed' when cashier generates receipt).
 */
async function updateAdvisorQueueStatus(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const queueId = req.params.id;
    const { status } = req.body;
    const userId = req.user?.id || req.user?.user_id || null;

    if (!status || !['pending', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({
        status: 'fail',
        error: 'Valid status is required (pending, completed, archived).',
      });
    }

    const updated = await invoiceParserService.updateAdvisorQueueStatus(queueId, tenantId, status, userId);
    if (!updated) {
      return res.status(404).json({
        status: 'fail',
        error: 'Invoice queue record not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Invoice status updated to ${status}.`,
      data: updated,
    });
  } catch (err) {
    console.error('[InvoiceV2Controller] updateAdvisorQueueStatus error:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message || 'Failed to update invoice queue status.',
    });
  }
}

module.exports = {
  parseInvoice,
  saveInvoice,
  listInvoices,
  getInvoiceDetails,
  searchSpareParts,
  getCustomerSpareParts,
  advisorUpload,
  getAdvisorQueue,
  getAdvisorQueueItem,
  getAdvisorQueuePdf,
  updateAdvisorQueueStatus,
};
