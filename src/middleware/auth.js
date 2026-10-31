const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Verifies JWT and attaches decoded user and tenant to request object
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Strictly require Authorization: Bearer header. Only permit query parameter token for proof streaming routes (for <img> tags)
  const isProofStream = req.path.includes('/proof');
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || (isProofStream ? req.query.token : null);

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      error: 'Authentication required. No valid bearer token provided.',
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
    // LOOP-06 & LOOP-20 Fix: Allow X-Tenant-ID header override ONLY for admin/super_admin/director/management roles.
    const isAdmin = ['admin', 'super_admin', 'regional_admin', 'director', 'management'].includes(user.role);
    const tenantId = (isAdmin && req.headers['x-tenant-id']) 
      ? req.headers['x-tenant-id'] 
      : (user.tenant_id || req.headers['x-tenant-id'] || 'bellad_and_company');

    req.tenantId = tenantId;
    next();
  });
};

module.exports = authenticateToken;
