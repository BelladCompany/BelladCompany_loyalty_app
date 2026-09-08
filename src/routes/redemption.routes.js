const express = require('express');
const router = express.Router();
const RedemptionController = require('../controllers/redemption.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const {
  requestOtpSchema,
  redeemPointsSchema,
} = require('../validators/schemas');

router.use(authenticateToken);

// 1. Request OTP for customer redemption (Cashier or Admin)
router.post(
  '/otp/request',
  requireRole(['cashier', 'admin']),
  validate(requestOtpSchema),
  RedemptionController.requestOtp
);

// 2. Submit OTP and points to redeem (Cashier or Admin)
router.post(
  '/redeem',
  requireRole(['cashier', 'admin']),
  validate(redeemPointsSchema),
  RedemptionController.redeemPoints
);

// 3. Get redemption details by unique redemption code (Cashier or Admin)
router.get(
  '/:code',
  requireRole(['cashier', 'admin']),
  RedemptionController.getRedemption
);

module.exports = router;
