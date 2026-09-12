const express = require('express');
const router = express.Router();
const KycController = require('../controllers/kyc.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { kycRateLimiter } = require('../middleware/rateLimiter');
const { uploadKycProof } = require('../middleware/upload');

router.use(authenticateToken);

// Cashier submits KYC change request (rate-limited, file upload enabled)
router.post(
  '/customers/:id/kyc-change',
  requireRole(['cashier', 'admin', 'branch_manager']),
  kycRateLimiter,
  uploadKycProof.single('id_proof_file'),
  KycController.submitChange
);

// Admin / Branch Manager queue and approval routes
router.get(
  '/admin/kyc-change/pending',
  requireRole(['admin', 'branch_manager']),
  KycController.getPendingRequests
);

router.post(
  '/admin/kyc-change/:id/approve',
  requireRole(['admin', 'branch_manager']),
  KycController.approveRequest
);

router.post(
  '/admin/kyc-change/:id/reject',
  requireRole(['admin', 'branch_manager']),
  KycController.rejectRequest
);

module.exports = router;
