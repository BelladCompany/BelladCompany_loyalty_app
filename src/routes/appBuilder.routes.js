const express = require('express');
const router = express.Router();
const AppBuilderController = require('../controllers/appBuilder.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// 1. Public runtime route for client app initialization (no login required so theme loads before login)
router.get('/published/:tenantId?', AppBuilderController.getPublishedConfig);

// 2. Authenticated editor endpoints
router.use(authenticateToken);

// Read tenant builder config
router.get('/config/:tenantId?', AppBuilderController.getConfig);

// Save draft or publish live
router.post(
  '/config/:tenantId?',
  requireRole(['admin', 'super_admin', 'regional_admin', 'director']),
  AppBuilderController.saveConfig
);

// Reset to defaults
router.post(
  '/reset/:tenantId?',
  requireRole(['admin', 'super_admin', 'director']),
  AppBuilderController.resetConfig
);

module.exports = router;
