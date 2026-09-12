const express = require('express');
const router = express.Router();
const ReferralController = require('../controllers/referral.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const {
  registerReferralSchema,
  approveReferralSchema,
  createApproverSchema,
} = require('../validators/schemas');

router.use(authenticateToken);

// 1. Register a referral (pending status, 0 points) - Cashier or Admin
router.post(
  '/',
  requireRole(['cashier', 'admin']),
  validate(registerReferralSchema),
  ReferralController.registerReferral
);

// 2. Approve a referral manually with points & reason - Admin only
router.post(
  '/:id/approve',
  requireRole(['admin']),
  validate(approveReferralSchema),
  ReferralController.approveReferral
);

// 3. List referrals - Cashier or Admin
router.get('/', requireRole(['cashier', 'admin']), ReferralController.listReferrals);

// 4. Approver management - Admin only
router.get('/approvers/list', requireRole(['admin']), ReferralController.listApprovers);
router.post('/approvers', requireRole(['admin']), validate(createApproverSchema), ReferralController.addApprover);

// 5. Referral Leads Pipeline - Admin & Cashier
router.get('/leads/pipeline', requireRole(['admin', 'cashier']), ReferralController.getReferralLeadsPipeline);
router.post('/leads/:id/confirm-rc', requireRole(['admin']), ReferralController.confirmRcCompletion);
router.post('/send-reminder', requireRole(['admin', 'cashier']), ReferralController.sendReferralReminder);

module.exports = router;
