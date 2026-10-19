const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/search.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const { searchSchema } = require('../validators/schemas');

const { searchRateLimiter } = require('../middleware/rateLimiter');

// Search endpoint accessible by all staff roles (rate limited against mass scraping)
router.get(
  '/',
  authenticateToken,
  requireRole(['cashier', 'admin', 'branch_manager', 'regional_admin', 'super_admin']),
  searchRateLimiter,
  validate(searchSchema, 'query'),
  SearchController.search
);

module.exports = router;
