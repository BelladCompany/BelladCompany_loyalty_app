const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/tenant.controller');
const authenticateToken = require('../middleware/auth');

const requireRole = require('../middleware/roles');

// List firms (authorized staff)
router.get('/firms', authenticateToken, requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager', 'cashier']), TenantController.listFirms);

// Create and update firms (strictly Admin / Super Admin)
router.post('/firms', authenticateToken, requireRole(['admin', 'super_admin']), TenantController.createFirm);
router.patch('/firms/:tenantId', authenticateToken, requireRole(['admin', 'super_admin']), TenantController.updateFirm);

module.exports = router;
