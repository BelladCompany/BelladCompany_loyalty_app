const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transaction.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { redemptionRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticateToken);

// Endpoint POST /api/transactions/sync (Cashier or Admin, rate-limited against flood attacks)
router.post(
  '/sync',
  requireRole(['cashier', 'admin']),
  redemptionRateLimiter,
  TransactionController.syncTransaction
);

// Endpoint GET /api/transactions/lookup (Cashier or Admin)
router.get(
  '/lookup',
  requireRole(['cashier', 'admin']),
  TransactionController.lookupTransaction
);

module.exports = router;
