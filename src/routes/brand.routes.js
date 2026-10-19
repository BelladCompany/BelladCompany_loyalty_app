const express = require('express');
const router = express.Router();
const BrandController = require('../controllers/brand.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createBrandSchema, updateBrandSchema } = require('../validators/schemas');

router.use(authenticateToken);

// Create brand (Admin only)
router.post('/', requireRole(['admin']), validate(createBrandSchema), BrandController.createBrand);

// List brands (Cashier, Branch Manager, Regional Admin, Admin, Super Admin)
router.get('/', requireRole(['cashier', 'admin', 'branch_manager', 'regional_admin', 'super_admin']), BrandController.listBrands);

// Get brand by ID (All staff roles)
router.get('/:id', requireRole(['cashier', 'admin', 'branch_manager', 'regional_admin', 'super_admin']), BrandController.getBrand);

// Update brand (Admin only)
router.put('/:id', requireRole(['admin']), validate(updateBrandSchema), BrandController.updateBrand);

// Delete brand (Admin only)
router.delete('/:id', requireRole(['admin']), BrandController.deleteBrand);

module.exports = router;
