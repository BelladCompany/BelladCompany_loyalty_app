const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/report.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(authenticateToken);
router.use(requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']));

router.get('/points-summary', ReportController.getPointsSummary);
router.get('/customer-distribution', ReportController.getCustomerDistribution);
router.get('/liability', ReportController.getLiability);
router.get('/referrals', ReportController.getReferrals);
router.get('/kyc-audit', ReportController.getKycAudit);

module.exports = router;
