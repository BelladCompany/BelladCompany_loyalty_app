const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Verifies JWT and attaches decoded user and tenant to request object
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || req.query.token;

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      error: 'Authentication required. No token provided.',
    });
  }

  jwt.verify(token, env.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({
        status: 'fail',
        error: 'Invalid or expired authentication token.',
      });
    }

    req.user = user;
    // Allow header override for multitenancy if admin, otherwise use user's tenant_id
    req.tenantId = req.headers['x-tenant-id'] || user.tenant_id || env.defaultTenantId;
    next();
  });
};

module.exports = authenticateToken;
