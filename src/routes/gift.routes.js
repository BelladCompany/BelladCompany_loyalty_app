const express = require('express');
const router = express.Router();
const GiftController = require('../controllers/gift.controller');
const authenticateToken = require('../middleware/auth');
const {
  otpRequestRateLimiter,
  otpVerifyRateLimiter,
  giftCardRateLimiter,
} = require('../middleware/rateLimiter');

// ─── Public Endpoints ────────────────────────────────────────────────────────
// 1. Look up gift details by secret URL claim token
router.get('/claim/:token', giftCardRateLimiter, GiftController.getGiftByClaimToken);

// 2. Claim gift with receiver phone number & DPDP consent (atomic, single-use, new-customers only)
router.post('/claim/:token', giftCardRateLimiter, GiftController.claimGift);

// 3. Razorpay payment webhook
router.post('/webhooks/razorpay', GiftController.handleRazorpayWebhook);


// ─── Protected / Sender Endpoints ────────────────────────────────────────────
// Optional token for public self-service sender, or authenticated customer portal session
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateToken(req, res, next);
  }
  next();
};

// 4. Create gift funded by Loyalty Points (4 Points = ₹1)
router.post('/create-from-points', optionalAuthenticate, giftCardRateLimiter, GiftController.createGiftFromPoints);

// 5. Create gift order funded by Razorpay
router.post('/create-from-razorpay', optionalAuthenticate, giftCardRateLimiter, GiftController.createGiftFromRazorpay);

// 6. Confirm Razorpay payment signature
router.post('/verify-razorpay-payment', optionalAuthenticate, GiftController.verifyRazorpayPayment);

// 7. Get sender's history of sent gifts
router.get('/my-sent-gifts', authenticateToken, GiftController.getMySentGifts);

module.exports = router;
