const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/search.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const { searchSchema } = require('../validators/schemas');

// Search endpoint accessible by cashier and admin
// Examples:
// GET /api/search?phone=9876543210
// GET /api/search?name=Sharma
router.get(
  '/',
  authenticateToken,
  requireRole(['cashier', 'admin']),
  validate(searchSchema, 'query'),
  SearchController.search
);

module.exports = router;
