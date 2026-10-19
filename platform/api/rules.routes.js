const express = require('express');
const router = express.Router();
const PlatformRulesController = require('./rules.controller');
const authenticateToken = require('../../src/middleware/auth');
const requireRole = require('../../src/middleware/roles');
const pubSub = require('../realtime/pubsub');

// 1. Real-Time SSE Stream (Public / Authenticated)
router.get('/stream', (req, res) => pubSub.handleSseStream(req, res));

// 2. Active Ruleset (High-performance caching with ETag)
router.get('/active', PlatformRulesController.getActiveRuleset);

// 3. Branding endpoint (Public / Cashier UI access)
router.get('/branding', PlatformRulesController.getBranding);

// Protected routes require authentication
router.use(authenticateToken);

// 4. Version Management
router.get('/versions', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), PlatformRulesController.listVersions);
router.get('/versions/:version_number', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), PlatformRulesController.getVersionByNumber);

// 5. Simulator Sandbox
router.post('/simulate', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), PlatformRulesController.simulate);

// 6. Draft, Publish & Rollback (Admin / Super Admin privileges)
router.post('/draft', requireRole(['admin', 'super_admin', 'regional_admin']), PlatformRulesController.saveDraft);
router.post('/publish', requireRole(['admin', 'super_admin']), PlatformRulesController.publish);
router.post('/rollback', requireRole(['admin', 'super_admin']), PlatformRulesController.rollback);

// 7. Branding Update
router.put('/branding', requireRole(['admin', 'super_admin']), PlatformRulesController.updateBranding);

module.exports = router;
