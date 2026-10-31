const { pool } = require('../config/db');

/**
 * Middleware to authenticate external API requests from DMS, RealBooks, AppSheet, or custom clients.
 * Supports:
 *  - X-API-Key: <key>
 *  - X-Integration-Key: <key>
 *  - Authorization: Bearer <key>
 */
async function authenticateApiKey(req, res, next) {
  try {
    let apiKey = req.headers['x-api-key'] || req.headers['x-integration-key'];

    if (!apiKey && req.headers['authorization']) {
      const authHeader = req.headers['authorization'];
      if (authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.slice(7).trim();
      }
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({
        status: 'fail',
        error: 'Unauthorized: Missing or invalid API key. Please pass your API key via the "X-API-Key" header or "Authorization: Bearer <key>".',
        help: {
          docs_url: '/api/v1/integration/docs',
          example_header: 'X-API-Key: bac_live_dms_7f8a9b0c1d2e3f4a5b6c',
        },
      });
    }

    // 1. Look up API key in integration_api_keys table
    const keyRes = await pool.query(
      `SELECT key_id, tenant_id, name, client_type, api_key_prefix, scopes, is_active, rate_limit_per_minute
       FROM integration_api_keys
       WHERE api_key = $1 AND is_active = true
       LIMIT 1;`,
      [apiKey.trim()]
    );

    let clientInfo = null;

    if (keyRes.rows.length > 0) {
      clientInfo = keyRes.rows[0];
      // Async update last_used_at without awaiting
      pool.query(`UPDATE integration_api_keys SET last_used_at = NOW() WHERE key_id = $1`, [clientInfo.key_id]).catch(() => {});
    } else {
      // 2. Check environment fallback keys (for backward compatibility & zero-config local testing)
      const masterKey = process.env.BELLAD_API_KEY || 'bac_live_master_bellad_loyalty_2026';
      const appsheetKey = process.env.APPSHEET_WEBHOOK_KEY || 'appsheet_secret_key_default_2026';

      if (apiKey === masterKey) {
        clientInfo = {
          key_id: 0,
          tenant_id: 'bellad_and_company',
          name: 'Master Fallback Integration Key',
          client_type: 'custom',
          api_key_prefix: 'bac_live_master',
          scopes: ['read', 'write', 'sync', 'redeem', 'admin'],
          is_active: true,
        };
      } else if (apiKey === appsheetKey) {
        clientInfo = {
          key_id: 0,
          tenant_id: 'bellad_and_company',
          name: 'AppSheet Webhook Key',
          client_type: 'appsheet',
          api_key_prefix: 'bac_live_appsheet',
          scopes: ['read', 'write', 'sync'],
          is_active: true,
        };
      }
    }

    if (!clientInfo) {
      return res.status(401).json({
        status: 'fail',
        error: 'Unauthorized: Invalid or revoked API key.',
      });
    }

    // Attach client info & tenant to request
    req.apiClient = clientInfo;
    req.tenantId = clientInfo.tenant_id || req.headers['x-tenant-id'] || 'bellad_and_company';

    next();
  } catch (err) {
    console.error('[API Key Auth Error]:', err);
    res.status(500).json({
      status: 'error',
      error: 'Internal authentication error.',
    });
  }
}

/**
 * Middleware factory to enforce required scope(s)
 * e.g. requireScope('write'), requireScope('sync'), requireScope('redeem')
 */
function requireScope(requiredScope) {
  return (req, res, next) => {
    if (!req.apiClient) {
      return res.status(401).json({ status: 'fail', error: 'Authentication required' });
    }

    const scopes = req.apiClient.scopes || [];
    if (scopes.includes('admin') || scopes.includes(requiredScope)) {
      return next();
    }

    return res.status(403).json({
      status: 'fail',
      error: `Forbidden: API key '${req.apiClient.name}' lacks the required '${requiredScope}' permission scope. Active scopes: [${scopes.join(', ')}]`,
    });
  };
}

module.exports = {
  authenticateApiKey,
  requireScope,
};
