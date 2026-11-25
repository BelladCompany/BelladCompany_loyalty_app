const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

// In-memory cache for user active sessions (userId -> { activeSessionId, cachedAt })
const sessionCache = new Map();
const CACHE_TTL_MS = 2500; // 2.5 seconds cache to avoid DB load spikes while guaranteeing near-instant revocation

function invalidateSessionCache(userId) {
  if (userId) {
    sessionCache.delete(String(userId));
  }
}

/**
 * Verifies JWT and attaches decoded user and tenant to request object.
 * Enforces single active session per user across devices and browser profiles.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Strictly require Authorization: Bearer header. Permit query parameter token for streaming routes (images, proofs, invoice PDFs)
  const isStreamingRoute = req.path.includes('/proof') || req.path.includes('/pdf') || req.path.includes('/advisor-queue');
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || (isStreamingRoute ? req.query.token : null);

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      error: 'Authentication required. No valid bearer token provided.',
    });
  }

  jwt.verify(token, env.jwtSecret, async (err, decodedUser) => {
    if (err) {
      return res.status(403).json({
        status: 'fail',
        error: 'Invalid or expired authentication token.',
      });
    }

    // Single-session concurrency verification for staff & operational users (admin, cashier, manager, director, etc.)
    if (decodedUser.role !== 'customer') {
      const userId = decodedUser.id || decodedUser.user_id;
      if (userId) {
        try {
          let activeSessionId = null;
          const now = Date.now();
          const cached = sessionCache.get(String(userId));

          if (cached && (now - cached.cachedAt < CACHE_TTL_MS)) {
            activeSessionId = cached.activeSessionId;
          } else {
            const sessionRes = await pool.query(
              `SELECT active_session_id FROM users WHERE user_id = $1 OR id = $1 LIMIT 1;`,
              [userId]
            );
            if (sessionRes.rows.length > 0) {
              activeSessionId = sessionRes.rows[0].active_session_id;
              sessionCache.set(String(userId), { activeSessionId, cachedAt: now });
            }
          }

          // If active_session_id is recorded in DB:
          // Check if token's sessionId matches. If not, the session was superseded by another login!
          if (activeSessionId) {
            if (!decodedUser.sessionId || decodedUser.sessionId !== activeSessionId) {
              return res.status(401).json({
                status: 'fail',
                code: 'SESSION_SUPERSEDED',
                error: 'Your session has expired because your account was logged in from another browser or device.',
              });
            }
          }
        } catch (dbErr) {
          console.error('[Session Check Warning]', dbErr.message || dbErr);
          // Fail open on database connection blips to prevent disrupting ongoing critical POS actions
        }
      }
    }

    req.user = decodedUser;
    // LOOP-06 & LOOP-20 Fix: Allow X-Tenant-ID header override ONLY for admin/super_admin/director/management roles.
    const isAdmin = ['admin', 'super_admin', 'regional_admin', 'director', 'management'].includes(decodedUser.role);
    const tenantId = (isAdmin && req.headers['x-tenant-id']) 
      ? req.headers['x-tenant-id'] 
      : (decodedUser.tenant_id || req.headers['x-tenant-id'] || 'bellad_and_company');

    req.tenantId = tenantId;
    next();
  });
};

authenticateToken.authenticateToken = authenticateToken;
authenticateToken.invalidateSessionCache = invalidateSessionCache;
try {
  authenticateToken.requireRole = require('./roles');
} catch (e) {}

module.exports = authenticateToken;
