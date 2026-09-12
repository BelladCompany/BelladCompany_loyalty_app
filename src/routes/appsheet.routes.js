const express = require('express');
const router = express.Router();
const AppSheetController = require('../controllers/appsheet.controller');
const appsheetAuth = require('../middleware/appsheetAuth');
const { appsheetRateLimiter } = require('../middleware/rateLimiter');

// Webhook endpoint protected strictly by rate limiter and X-AppSheet-Key shared-secret auth
router.post('/webhook/transaction', appsheetRateLimiter, appsheetAuth, AppSheetController.handleTransactionWebhook);

module.exports = router;
