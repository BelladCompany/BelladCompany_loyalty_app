const express = require('express');
const router = express.Router();
const CustomerPortalController = require('../controllers/customerPortal.controller');
const authenticateToken = require('../middleware/auth');
const loginRateLimiter = require('../middleware/rateLimiter');

// Public endpoints
router.post('/auth/request-otp', loginRateLimiter, CustomerPortalController.requestOtp);
router.post('/auth/otp-verify', loginRateLimiter, CustomerPortalController.otpVerify);

// Protected customer endpoints
router.get('/me', authenticateToken, CustomerPortalController.getMe);
router.get('/me/ledger', authenticateToken, CustomerPortalController.getLedger);

module.exports = router;
