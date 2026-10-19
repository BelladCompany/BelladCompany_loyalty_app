const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customer.controller');
const PointsController = require('../controllers/points.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const {
  createCustomerSchema,
  updateCustomerSchema,
  addPhoneSchema,
  ledgerQuerySchema,
} = require('../validators/schemas');

const { otpRequestRateLimiter, otpVerifyRateLimiter } = require('../middleware/rateLimiter');

// All customer routes require authentication
router.use(authenticateToken);

// Request OTP for manual customer creation (rate limited against SMS pumping)
router.post('/request-creation-otp', requireRole(['cashier', 'admin']), otpRequestRateLimiter, CustomerController.requestCustomerCreationOtp);

// Create customer (Cashier or Admin, rate limited against OTP guessing)
router.post('/', requireRole(['cashier', 'admin']), otpVerifyRateLimiter, validate(createCustomerSchema), CustomerController.createCustomer);

// List customers
router.get('/', requireRole(['cashier', 'admin']), CustomerController.listCustomers);

// Lookup referring customer profile by referral code (customer_id or phone)
router.get('/by-referral-code/:code', requireRole(['cashier', 'admin']), CustomerController.getByReferralCode);

// Get customer by customer_id (e.g. BAC-100001)
router.get('/:customerId', requireRole(['cashier', 'admin']), CustomerController.getCustomer);

// Update customer details
router.put('/:customerId', requireRole(['cashier', 'admin']), validate(updateCustomerSchema), CustomerController.updateCustomer);

// Delete customer (Admin only)
router.delete('/:customerId', requireRole(['admin']), CustomerController.deleteCustomer);

// Customer Phones sub-resource (Admin only - Cashiers MUST submit via /api/customers/:id/kyc-change)
router.post('/:customerId/phones', requireRole(['admin']), validate(addPhoneSchema), CustomerController.addPhone);
router.delete('/:customerId/phones/:phoneId', requireRole(['admin']), CustomerController.removePhone);

// Customer full points ledger and current tier history
router.get(
  '/:customerId/ledger',
  requireRole(['cashier', 'admin']),
  validate(ledgerQuerySchema, 'query'),
  PointsController.getCustomerLedger
);

module.exports = router;
