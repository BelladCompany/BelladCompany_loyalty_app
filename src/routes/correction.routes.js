const express = require('express');
const router = express.Router();
const CorrectionController = require('../controllers/correction.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { uploadCorrectionProof } = require('../middleware/uploadCorrectionProof');

// All correction routes require authentication
router.use(authenticateToken);

// Preview correction calculation (Cashier or Admin)
router.post(
  '/preview',
  requireRole(['cashier', 'admin', 'super_admin', 'regional_admin', 'branch_manager']),
  CorrectionController.previewCorrection
);

// Cashier raises a correction ticket with mandatory screenshot file upload & 20+ char explanation
router.post(
  '/raise',
  requireRole(['cashier', 'admin', 'super_admin', 'regional_admin', 'branch_manager']),
  uploadCorrectionProof.single('screenshot'),
  CorrectionController.raiseCorrection
);

// Stream authenticated proof file (Restricted to authorized roles with tenant verification)
router.get(
  '/proof/:filename',
  requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager', 'cashier']),
  CorrectionController.streamCorrectionProof
);

// Admin queue listing requests
router.get(
  ['/list', '/admin/list'],
  requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']),
  CorrectionController.listCorrections
);

// Admin approve correction request
router.post(
  ['/:id/approve', '/admin/:id/approve'],
  requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']),
  CorrectionController.approveCorrection
);

// Admin reject correction request
router.post(
  ['/:id/reject', '/admin/:id/reject'],
  requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']),
  CorrectionController.rejectCorrection
);

module.exports = router;
