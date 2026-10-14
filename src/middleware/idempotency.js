/**
 * Idempotency Middleware
 * automobile-loyalty-backend
 *
 * Role: Senior Full-Stack Engineer / Principal Architect
 * Purpose: Intercepts requests with Idempotency-Key header, checking for existing
 *          ledger rows or cached responses to prevent duplicate operations (LOOP-09 fix).
 */
const { pool } = require('../config/db');

async function checkIdempotency(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    // If no key provided, proceed normally
    return next();
  }

  const cleanKey = idempotencyKey.trim();
  const tenantId = req.tenantId || req.user?.tenant_id;

  if (!tenantId) {
    return next();
  }

  try {
    // Check if an entry with this idempotency_key has already been written to points_ledger
    const existingLedger = await pool.query(
      `SELECT * FROM points_ledger 
       WHERE tenant_id = $1 AND idempotency_key = $2 
       LIMIT 1;`,
      [tenantId, cleanKey]
    );

    if (existingLedger.rows.length > 0) {
      const entry = existingLedger.rows[0];
      console.log(`[Idempotency Hit] Key '${cleanKey}' already processed. Returning existing result.`);
      return res.status(200).json({
        status: 'success',
        message: 'Idempotent response: Transaction was previously processed.',
        idempotent: true,
        data: entry,
      });
    }

    // Attach key to request for downstream controller/service use
    req.idempotencyKey = cleanKey;
    next();
  } catch (err) {
    console.error('[Idempotency Check Error]', err);
    next();
  }
}

module.exports = checkIdempotency;
