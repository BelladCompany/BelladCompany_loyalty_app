const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/tenant.controller');
const authenticateToken = require('../middleware/auth');

// List firms
router.get('/firms', authenticateToken, TenantController.listFirms);
router.post('/firms', authenticateToken, TenantController.createFirm);
router.patch('/firms/:tenantId', authenticateToken, TenantController.updateFirm);

module.exports = router;
