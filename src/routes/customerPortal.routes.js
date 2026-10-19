const express = require('express');
const router = express.Router();
const CustomerPortalController = require('../controllers/customerPortal.controller');
const authenticateToken = require('../middleware/auth');
const {
  otpRequestRateLimiter,
  otpVerifyRateLimiter,
  giftCardRateLimiter,
} = require('../middleware/rateLimiter');

// Public authentication endpoints (strictly rate limited against OTP spamming and code brute-forcing)
router.post('/auth/request-otp', otpRequestRateLimiter, CustomerPortalController.requestOtp);
router.post('/auth/otp-verify', otpVerifyRateLimiter, CustomerPortalController.otpVerify);

// Protected customer portal endpoints
router.get('/me', authenticateToken, CustomerPortalController.getMe);
router.get('/me/ledger', authenticateToken, CustomerPortalController.getLedger);
router.get('/me/referrals', authenticateToken, CustomerPortalController.getReferrals);
router.post('/me/referrals/submit', authenticateToken, CustomerPortalController.submitReferral);
router.get('/me/gift-cards', authenticateToken, CustomerPortalController.getMyGiftCards);
router.post('/me/gift-cards/claim', authenticateToken, giftCardRateLimiter, CustomerPortalController.claimGiftCard);

module.exports = router;
