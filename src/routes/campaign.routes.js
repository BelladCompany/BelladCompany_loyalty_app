/**
 * Campaign Add-on Routes
 * automobile-loyalty-backend (v2)
 *
 * Role: Director / Admin Access Only
 */
const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaign.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// All campaign management routes require authentication and Director/Admin role
router.use(authenticateToken);
router.use(requireRole(['director', 'admin']));

// 1. List all campaigns
router.get('/', CampaignController.listCampaigns);

// 2. Dry-run preview simulation & dummy sync
router.post('/preview', CampaignController.previewSaleTest);
router.post('/sync-dummy-customers', CampaignController.syncDummyCustomers);

// 3. Create a campaign
router.post('/', CampaignController.createCampaign);

// 4. Get campaign details
router.get('/:id', CampaignController.getCampaign);

// 5. Update campaign (locked fields checked if active)
router.patch('/:id', CampaignController.updateCampaign);

// 6. Lifecycle transitions
router.post('/:id/activate', CampaignController.activateCampaign);
router.post('/:id/cancel', CampaignController.cancelCampaign);
router.post('/:id/duplicate', CampaignController.duplicateCampaign);

// 7. Performance & liabilities report
router.get('/:id/report', CampaignController.getCampaignReport);

module.exports = router;
