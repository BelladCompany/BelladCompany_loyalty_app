const express = require('express');
const router = express.Router();
const PointsController = require('../controllers/points.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const { earnPointsSchema, ledgerQuerySchema } = require('../validators/schemas');

router.use(authenticateToken);

// Record points earning (Sale or Service) - Cashier or Admin
router.post(
  '/earn',
  requireRole(['cashier', 'admin']),
  validate(earnPointsSchema),
  PointsController.earnPoints
);

// Manually grant in-house points (Finance, Insurance, Exchange)
router.post(
  '/inhouse-bonus',
  requireRole(['cashier', 'admin']),
  PointsController.grantInhouseBonus
);

// Get customer full ledger history and current tier
router.get(
  '/customers/:customerId/ledger',
  requireRole(['cashier', 'admin']),
  validate(ledgerQuerySchema, 'query'),
  PointsController.getCustomerLedger
);

module.exports = router;
