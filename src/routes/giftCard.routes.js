const express = require('express');
const router = express.Router();
const GiftCardController = require('../controllers/giftCard.controller');
const authenticateToken = require('../middleware/auth');

const requireRole = require('../middleware/roles');
const { giftCardRateLimiter } = require('../middleware/rateLimiter');

// Gift card PIN lookup (rate limited to prevent brute forcing 4-digit PINs)
router.post(
  '/lookup',
  authenticateToken,
  giftCardRateLimiter,
  requireRole(['cashier', 'admin', 'super_admin', 'branch_manager']),
  GiftCardController.lookupGiftCard
);

// Issue new gift cards (Strictly restricted to Admin / Super Admin)
router.post(
  '/issue',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  GiftCardController.issueGiftCard
);

// Customer / Cashier claim gift card code into points (rate-limited)
router.post(
  '/claim',
  authenticateToken,
  giftCardRateLimiter,
  GiftCardController.claimGiftCard
);

// POS Billing deduction (Restricted to Cashier / Admin)
router.post(
  '/redeem',
  authenticateToken,
  requireRole(['cashier', 'admin', 'super_admin']),
  GiftCardController.redeemGiftCardAtPos
);

// List gift cards (Restricted to authorized staff, PINs never exposed)
router.get(
  '/',
  authenticateToken,
  requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager', 'cashier']),
  GiftCardController.listGiftCards
);

// Customer portal self-service
router.get('/my-cards', authenticateToken, GiftCardController.getMyGiftCards);

module.exports = router;
