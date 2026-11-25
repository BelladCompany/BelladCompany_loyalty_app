// src/routes/invoiceV2.routes.js
// V2 Dealership Invoice OCR & Spare Parts Catalog Routes
// Mounted at /api/v2/invoices

const express = require('express');
const multer = require('multer');
const router = express.Router();
const invoiceController = require('../controllers/invoiceV2.controller');
const { authenticateToken } = require('../middleware/auth');

// Memory storage for fast PDF buffer processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF invoice documents are supported.'));
    }
  },
});

// Middleware to accept multiple common field names for single or bulk PDF uploads
const uploadInvoiceMiddleware = (req, res, next) => {
  const uploadFiles = upload.fields([
    { name: 'invoice_pdf', maxCount: 50 },
    { name: 'invoice_pdfs', maxCount: 50 },
    { name: 'files', maxCount: 50 },
    { name: 'file', maxCount: 50 },
    { name: 'receipt', maxCount: 50 },
  ]);

  uploadFiles(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'fail',
          error: 'The uploaded PDF is too large. Maximum supported size is 25MB per file.',
        });
      }
      return res.status(400).json({
        status: 'fail',
        error: `File upload failed: ${err.message}`,
      });
    }

    // Collect all attached files into req.uploadedFiles and normalize first to req.file
    const allFiles = [];
    if (req.files) {
      ['invoice_pdf', 'invoice_pdfs', 'files', 'file', 'receipt'].forEach((field) => {
        if (Array.isArray(req.files[field])) {
          allFiles.push(...req.files[field]);
        }
      });
    }
    req.uploadedFiles = allFiles;
    req.file = allFiles[0] || null;

    next();
  });
};

// All V2 invoice routes require authentication
router.use(authenticateToken);

// 1. Parse PDF and return preview (optional: save immediately via query ?save=true)
router.post('/parse', uploadInvoiceMiddleware, invoiceController.parseInvoice);

// 2. Persist parsed invoice & line items to DB & auto-update spare parts catalog
router.post('/save', invoiceController.saveInvoice);

// 3. Search spare parts catalog with price history
router.get('/spare-parts/search', invoiceController.searchSpareParts);

// 4. List saved invoices
router.get('/', invoiceController.listInvoices);

// 5. Get all spare parts and prices recorded for a specific customer
router.get('/customers/:customerId/parts', invoiceController.getCustomerSpareParts);

// 6. Advisor Invoice PDF Queue (Upload, Stream PDF, Day-Wise List, Status Update)
router.post('/advisor-upload', uploadInvoiceMiddleware, invoiceController.advisorUpload);
router.get('/advisor-queue', invoiceController.getAdvisorQueue);
router.get('/advisor-queue/:id', invoiceController.getAdvisorQueueItem);
router.get('/advisor-queue/:id/pdf', invoiceController.getAdvisorQueuePdf);
router.patch('/advisor-queue/:id/status', invoiceController.updateAdvisorQueueStatus);

// 7. Get invoice details and line items by ID
router.get('/:id', invoiceController.getInvoiceDetails);

module.exports = router;
