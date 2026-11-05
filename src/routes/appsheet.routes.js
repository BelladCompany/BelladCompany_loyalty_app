const express = require('express');
const router = express.Router();
const AppSheetController = require('../controllers/appsheet.controller');
const appsheetAuth = require('../middleware/appsheetAuth');
const { appsheetRateLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, requireRole } = require('../middleware/auth');

// 1. Webhook endpoints for real-time AppSheet Bot line-item triggers
router.post('/webhook/transaction', appsheetRateLimiter, appsheetAuth, AppSheetController.handleTransactionWebhook);
router.post('/webhook/line-item', appsheetRateLimiter, appsheetAuth, AppSheetController.handleTransactionWebhook);
router.post('/webhook/pr-done', appsheetRateLimiter, appsheetAuth, AppSheetController.handlePrDoneWebhook);

// 2. On-demand batch sync endpoint (AppSheet API -> Loyalty from April 01, 2026 onwards)
// Accessible via AppSheet webhook auth key OR JWT (director / admin / super_admin)
router.post(
  '/sync-pr-done',
  (req, res, next) => {
    // If bearer token present, authenticate via JWT; otherwise via appsheetAuth
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      return authenticateToken(req, res, (err) => {
        if (err) return next(err);
        return requireRole(['director', 'admin', 'super_admin'])(req, res, next);
      });
    }
    return appsheetAuth(req, res, next);
  },
  AppSheetController.syncPrDone
);

// 3. Status of AppSheet sync & recent logs
router.get('/sync-status', AppSheetController.getSyncStatus);

module.exports = router;
