const express = require('express');
const router = express.Router();
const MasterEditorController = require('../controllers/masterEditor.controller');
const authenticateToken = require('../middleware/auth');

const requireRole = require('../middleware/roles');

// All master editor routes require authentication
router.use(authenticateToken);

// 1. Lookups & Simulator endpoints (accessible by admin and branch managers)
router.get('/lookups', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), MasterEditorController.getLookups);
router.post('/simulate', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), MasterEditorController.simulateRule);

// 2. User Access Control (Staff, Role & Branch Management) - Restricted to admin/super_admin/regional_admin/director
router.get('/users/list', requireRole(['admin', 'super_admin', 'regional_admin', 'director']), MasterEditorController.getUsers);
router.patch('/users/:id/role', requireRole(['admin', 'super_admin', 'director']), MasterEditorController.updateUserRole);
router.patch('/users/:id/branch', requireRole(['admin', 'super_admin', 'director']), MasterEditorController.updateUserBranch);
router.post('/users', requireRole(['admin', 'super_admin', 'director']), MasterEditorController.createUser);
router.post('/users/:id/reset-password', requireRole(['admin', 'super_admin', 'director']), MasterEditorController.resetUserPassword);
router.delete('/users/:id', requireRole(['admin', 'super_admin', 'director']), MasterEditorController.deleteUser);

// 3. Custom Schemes Registration - Admin / Super Admin only
router.post('/schemes/register', requireRole(['admin', 'super_admin', 'regional_admin']), MasterEditorController.registerCustomScheme);

// 3b. Customer Priority Tiers (Silver, Gold, Platinum/VIP) Dynamic Slabs
router.get('/priority-tiers', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), MasterEditorController.getPriorityTiers);
router.post('/priority-tiers', requireRole(['admin', 'super_admin', 'regional_admin']), MasterEditorController.savePriorityTier);

// 3c. Dealership Policy & Modules Configuration
router.get('/dealerships/policy', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), MasterEditorController.getDealershipPolicy);
router.post('/dealerships/policy', requireRole(['admin', 'super_admin', 'regional_admin']), MasterEditorController.saveDealershipPolicy);

// 3d. Points Gain Formulas
router.get('/points-formulas', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), MasterEditorController.getPointsFormulas);
router.post('/points-formulas', requireRole(['admin', 'super_admin', 'regional_admin']), MasterEditorController.savePointsFormula);

// 4. Rules listing & creation
router.get('/', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), MasterEditorController.listRules);
router.post('/', requireRole(['admin', 'super_admin', 'regional_admin']), MasterEditorController.createRule);

// 5. Single rule operations
router.get('/:id', requireRole(['admin', 'super_admin', 'regional_admin', 'branch_manager']), MasterEditorController.getRuleById);
router.put('/:id', requireRole(['admin', 'super_admin', 'regional_admin']), MasterEditorController.updateRule);
router.delete('/:id', requireRole(['admin', 'super_admin']), MasterEditorController.deleteRule);

// 6. Director Governance & Quick Action endpoints
router.post('/:id/approve', requireRole(['admin', 'super_admin']), MasterEditorController.approveRule);
router.post('/:id/reject', requireRole(['admin', 'super_admin']), MasterEditorController.rejectRule);
router.post('/:id/toggle-active', requireRole(['admin', 'super_admin', 'regional_admin']), MasterEditorController.toggleActive);

module.exports = router;
