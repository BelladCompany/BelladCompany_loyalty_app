const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transaction.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(authenticateToken);

// Endpoint POST /api/transactions/sync (Cashier or Admin)
router.post(
  '/sync',
  requireRole(['cashier', 'admin']),
  TransactionController.syncTransaction
);

// Endpoint GET /api/transactions/lookup (Cashier or Admin)
router.get(
  '/lookup',
  requireRole(['cashier', 'admin']),
  TransactionController.lookupTransaction
);

module.exports = router;
