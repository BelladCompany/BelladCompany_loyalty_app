const express = require('express');
const router = express.Router();
const GiftCardController = require('../controllers/giftCard.controller');
const authenticateToken = require('../middleware/auth');

// Public / Pos Lookup
router.post('/lookup', authenticateToken, GiftCardController.lookupGiftCard);

// Cashier / Admin operations
router.post('/issue', authenticateToken, GiftCardController.issueGiftCard);
router.post('/claim', authenticateToken, GiftCardController.claimGiftCard);
router.post('/redeem', authenticateToken, GiftCardController.redeemGiftCardAtPos);
router.get('/', authenticateToken, GiftCardController.listGiftCards);

// Customer portal self-service
router.get('/my-cards', authenticateToken, GiftCardController.getMyGiftCards);

module.exports = router;
