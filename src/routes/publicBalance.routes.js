const express = require('express');
const router = express.Router();
const PublicBalanceController = require('../controllers/publicBalance.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { publicBalanceRateLimiter } = require('../middleware/rateLimiter');

// Public read-only endpoint (unauthenticated, IP rate-limited)
router.get('/balance/:token', publicBalanceRateLimiter, PublicBalanceController.getPublicBalance);

// Protected endpoints for staff/admins to manage customer tokens
router.post(
  '/customers/:id/public-token/revoke',
  authenticateToken,
  requireRole(['cashier', 'admin', 'branch_manager']),
  PublicBalanceController.revokePublicToken
);

router.post(
  '/customers/:id/public-token/regenerate',
  authenticateToken,
  requireRole(['cashier', 'admin', 'branch_manager']),
  PublicBalanceController.regeneratePublicToken
);

module.exports = router;
