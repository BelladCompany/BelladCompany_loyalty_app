const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const loginRateLimiter = require('../middleware/rateLimiter');
const { loginSchema, registerSchema } = require('../validators/schemas');

// Public route: User login (rate-limited against brute force)
router.post('/login', loginRateLimiter, validate(loginSchema), AuthController.login);

// Protected route: Admin only register new users
router.post('/register', authenticateToken, requireRole(['admin']), validate(registerSchema), AuthController.register);

// Protected route: Current user details
router.get('/me', authenticateToken, AuthController.me);

module.exports = router;
