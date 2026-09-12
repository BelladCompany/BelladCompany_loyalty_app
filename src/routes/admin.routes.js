const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const { mergeCustomersSchema } = require('../validators/schemas');

// All admin routes strictly require admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// 1. Get duplicate customer candidate queue
router.get('/duplicates/queue', AdminController.getDuplicateQueue);

// 2. Approve and execute customer merge
router.post('/duplicates/merge', validate(mergeCustomersSchema), AdminController.approveMerge);

// 3. Get customer merge audit logs
router.get('/duplicates/logs', AdminController.getMergeLogs);

// 4. View RealBooks sync failures
router.get('/realbooks/sync-failures', AdminController.getRealBooksSyncFailures);

// 5. Manually trigger retry for a failed RealBooks sync log
router.post('/realbooks/retry/:id', AdminController.retryRealBooksSync);

// 6. View WhatsApp message delivery logs
router.get('/whatsapp-logs', AdminController.getWhatsAppLogs);

// 7. View AppSheet webhook transaction log entries
router.get('/appsheet-logs', AdminController.getAppSheetWebhookLogs);

module.exports = router;
