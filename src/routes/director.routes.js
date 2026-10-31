const express = require('express');
const router = express.Router();
const DirectorController = require('../controllers/director.controller');
const authenticateToken = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Strictly enforce Executive Director & Admin privileges
router.use(authenticateToken);
router.use(requireRole(['director', 'management', 'admin', 'super_admin', 'regional_admin']));

// Executive Overview & High-level KPIs
router.get('/overview', DirectorController.getOverview);

// Dynamic Filterable Records Ledger & Audit Stream
router.get('/records', DirectorController.getRecords);

module.exports = router;
