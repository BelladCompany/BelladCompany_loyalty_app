const express = require('express');
const router = express.Router();
const IntegrationController = require('../controllers/integration.controller');
const { authenticateApiKey, requireScope } = require('../middleware/apiKeyAuth');

// ── Public / Health & Docs Endpoints ──
router.get('/health', authenticateApiKey, IntegrationController.getHealth);
router.get('/docs', IntegrationController.getDocs); // Documentation can be viewed without auth or with auth

// ── Customer CRUD Endpoints ──
router.get('/customers', authenticateApiKey, requireScope('read'), IntegrationController.getCustomers);
router.get('/customers/:id', authenticateApiKey, requireScope('read'), IntegrationController.getCustomerById);
router.post('/customers', authenticateApiKey, requireScope('write'), IntegrationController.createCustomer);
router.put('/customers/:id', authenticateApiKey, requireScope('write'), IntegrationController.updateCustomer);
router.patch('/customers/:id', authenticateApiKey, requireScope('write'), IntegrationController.updateCustomer);

// ── Transactions & Billing Ingestion (DMS / AppSheet) ──
router.post('/transactions/invoice', authenticateApiKey, requireScope('write'), IntegrationController.ingestInvoice);
router.post('/transactions/redeem', authenticateApiKey, requireScope('redeem'), IntegrationController.redeemPoints);

// ── RealBooks Accounting Sync Endpoints ──
router.get('/realbooks/feed', authenticateApiKey, requireScope('sync'), IntegrationController.getRealBooksFeed);
router.post('/realbooks/ack', authenticateApiKey, requireScope('sync'), IntegrationController.ackRealBooks);

// ── AppSheet Direct Webhook ──
router.post('/appsheet/webhook', authenticateApiKey, requireScope('write'), IntegrationController.appsheetWebhook);

// ── API Key Management (Admin Scope) ──
router.get('/keys', authenticateApiKey, requireScope('admin'), IntegrationController.listKeys);
router.post('/keys', authenticateApiKey, requireScope('admin'), IntegrationController.createKey);
router.delete('/keys/:id', authenticateApiKey, requireScope('admin'), IntegrationController.revokeKey);

module.exports = router;
