const express = require('express');
const router = express.Router();
const MasterEditorController = require('../controllers/masterEditor.controller');
const authenticateToken = require('../middleware/auth');

// All master editor routes require authentication
router.use(authenticateToken);

// 1. Lookups endpoint (models, branches, variants, brands, scheme types, etc.)
router.get('/lookups', MasterEditorController.getLookups);

// 2. Simulator endpoint (test dry-run calculation before saving/publishing)
router.post('/simulate', MasterEditorController.simulateRule);

// 3. User Access Control (1-Click Role Switch & 2-Click Add Staff)
router.get('/users/list', MasterEditorController.getUsers);
router.patch('/users/:id/role', MasterEditorController.updateUserRole);
router.post('/users', MasterEditorController.createUser);

// 4. Custom Schemes Registration
router.post('/schemes/register', MasterEditorController.registerCustomScheme);

// 5. Rules listing & creation
router.get('/', MasterEditorController.listRules);
router.post('/', MasterEditorController.createRule);

// 6. Single rule operations
router.get('/:id', MasterEditorController.getRuleById);
router.put('/:id', MasterEditorController.updateRule);
router.delete('/:id', MasterEditorController.deleteRule);

// 7. Director Governance & Quick Action endpoints
router.post('/:id/approve', MasterEditorController.approveRule);
router.post('/:id/reject', MasterEditorController.rejectRule);
router.post('/:id/toggle-active', MasterEditorController.toggleActive);

module.exports = router;
