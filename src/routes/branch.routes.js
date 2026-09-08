const express = require('express');
const router = express.Router();
const BranchController = require('../controllers/branch.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createBranchSchema, updateBranchSchema } = require('../validators/schemas');

router.use(authenticateToken);

// Create branch (Admin only)
router.post('/', requireRole(['admin']), validate(createBranchSchema), BranchController.createBranch);

// List branches (Cashier or Admin)
router.get('/', requireRole(['cashier', 'admin']), BranchController.listBranches);

// Get branch by ID (Cashier or Admin)
router.get('/:id', requireRole(['cashier', 'admin']), BranchController.getBranch);

// Update branch (Admin only)
router.put('/:id', requireRole(['admin']), validate(updateBranchSchema), BranchController.updateBranch);

// Delete branch (Admin only)
router.delete('/:id', requireRole(['admin']), BranchController.deleteBranch);

module.exports = router;
