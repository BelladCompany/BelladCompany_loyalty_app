const express = require('express');
const router = express.Router();
const CustomerPortalController = require('../controllers/customerPortal.controller');
const authenticateToken = require('../middleware/auth');
const loginRateLimiter = require('../middleware/rateLimiter');

// Public authentication endpoints
router.post('/auth/request-otp', loginRateLimiter, CustomerPortalController.requestOtp);
router.post('/auth/otp-verify', loginRateLimiter, CustomerPortalController.otpVerify);

// Protected customer portal endpoints
router.get('/me', authenticateToken, CustomerPortalController.getMe);
router.get('/me/ledger', authenticateToken, CustomerPortalController.getLedger);
router.get('/me/referrals', authenticateToken, CustomerPortalController.getReferrals);
router.post('/me/referrals/submit', authenticateToken, CustomerPortalController.submitReferral);
router.get('/me/gift-cards', authenticateToken, CustomerPortalController.getMyGiftCards);
router.post('/me/gift-cards/claim', authenticateToken, CustomerPortalController.claimGiftCard);

module.exports = router;
