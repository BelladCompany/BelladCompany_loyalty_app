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

const { otpRequestRateLimiter, otpVerifyRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticateToken);

// 1. Request OTP for customer redemption (Cashier or Admin, rate limited against SMS pumping)
router.post(
  '/otp/request',
  requireRole(['cashier', 'admin']),
  otpRequestRateLimiter,
  validate(requestOtpSchema),
  RedemptionController.requestOtp
);

// 2. Submit OTP and points to redeem (Cashier or Admin, rate limited against brute force)
router.post(
  '/redeem',
  requireRole(['cashier', 'admin']),
  otpVerifyRateLimiter,
  validate(redeemPointsSchema),
  RedemptionController.redeemPoints
);

// 3. Get vehicle redemption eligibility status (Cashier or Admin)
router.get(
  '/vehicle/:vehicle_id/status',
  requireRole(['cashier', 'admin']),
  RedemptionController.getVehicleRedemptionStatus
);

// 4. Get redemption details by unique redemption code (Cashier or Admin)
router.get(
  '/:code',
  requireRole(['cashier', 'admin']),
  RedemptionController.getRedemption
);

module.exports = router;
