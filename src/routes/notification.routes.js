const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const {
  sendPointsEarnedNowSchema,
  sendRedemptionNowSchema,
} = require('../validators/schemas');

router.use(authenticateToken);

// 1. Manually send "points earned" WhatsApp synchronously (Cashier or Admin)
router.post(
  '/points-earned/send',
  requireRole(['cashier', 'admin']),
  validate(sendPointsEarnedNowSchema),
  NotificationController.sendPointsEarnedNow
);

// 2. Manually send "redemption confirmed" WhatsApp synchronously (Cashier or Admin)
router.post(
  '/redemption/send',
  requireRole(['cashier', 'admin']),
  validate(sendRedemptionNowSchema),
  NotificationController.sendRedemptionNow
);

// 3. Recent WhatsApp message log (Cashier or Admin)
router.get(
  '/logs',
  requireRole(['cashier', 'admin']),
  NotificationController.getRecentLogs
);

module.exports = router;