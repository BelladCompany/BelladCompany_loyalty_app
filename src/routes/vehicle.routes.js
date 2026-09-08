const express = require('express');
const router = express.Router();
const VehicleController = require('../controllers/vehicle.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createVehicleSchema, updateVehicleSchema } = require('../validators/schemas');

router.use(authenticateToken);

// Create vehicle (Cashier or Admin)
router.post('/', requireRole(['cashier', 'admin']), validate(createVehicleSchema), VehicleController.createVehicle);

// List vehicles
router.get('/', requireRole(['cashier', 'admin']), VehicleController.listVehicles);

// Get vehicle by ID
router.get('/:id', requireRole(['cashier', 'admin']), VehicleController.getVehicle);

// Update vehicle
router.put('/:id', requireRole(['cashier', 'admin']), validate(updateVehicleSchema), VehicleController.updateVehicle);

// Delete vehicle (Admin only)
router.delete('/:id', requireRole(['admin']), VehicleController.deleteVehicle);

module.exports = router;
