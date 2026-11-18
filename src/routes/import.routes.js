const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const ImportController = require('../controllers/import.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// Temporary disk storage for fast, streaming processing of large files (up to 250MB)
const tempImportDir = path.join(__dirname, '../../uploads/temp_imports');
if (!fs.existsSync(tempImportDir)) {
  fs.mkdirSync(tempImportDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempImportDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.xlsx';
    cb(null, `import-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB limit to easily handle 50MB+ datasets
});

// Middleware wrapper to catch Multer errors (e.g. LIMIT_FILE_SIZE) cleanly
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'fail',
          error: 'The uploaded file is too large. Maximum supported file size is 250MB.'
        });
      }
      return res.status(400).json({
        status: 'fail',
        error: 'File upload failed: ' + (err.message || 'Invalid file')
      });
    }
    next();
  });
};

// Inspect workbook tabs & columns
router.post(
  '/inspect',
  authenticateToken,
  requireRole(['admin', 'director', 'super_admin', 'branch_manager', 'cashier']),
  handleUpload,
  ImportController.inspect
);

// Execute bulk order import from sheet
router.post(
  '/order-form',
  authenticateToken,
  requireRole(['admin', 'director', 'super_admin', 'branch_manager', 'cashier']),
  handleUpload,
  ImportController.importOrders
);

module.exports = router;
