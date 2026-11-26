const crypto = require('crypto');

/**
 * Middleware that validates the shared-secret header sent by AppSheet bots.
 * Accepts:
 *  - X-AppSheet-Key header
 *  - ApplicationAccessKey header
 *  - x-api-key header
 *  - query param ?key= or ?api_key=
 * Compares against APPSHEET_WEBHOOK_KEY and APPSHEET_ACCESS_KEY.
 */
function appsheetAuth(req, res, next) {
  const apiKey =
    req.headers['x-appsheet-key'] ||
    req.headers['applicationaccesskey'] ||
    req.headers['x-api-key'] ||
    req.query.key ||
    req.query.api_key;

  const isProduction = process.env.NODE_ENV === 'production';
  const expectedWebhookKey = process.env.APPSHEET_WEBHOOK_KEY || (isProduction ? null : 'appsheet_secret_key_default_2026');
  const expectedAccessKey = process.env.APPSHEET_ACCESS_KEY || (isProduction ? null : 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY');

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  let isValid = false;

  if (apiKey && typeof apiKey === 'string') {
    const keyTrimmed = apiKey.trim();
    const keyHash = crypto.createHash('sha256').update(keyTrimmed).digest();

    if (expectedWebhookKey) {
      const exp1Hash = crypto.createHash('sha256').update(expectedWebhookKey).digest();
      if (crypto.timingSafeEqual(keyHash, exp1Hash)) {
        isValid = true;
      }
    }

    if (!isValid && expectedAccessKey) {
      const exp2Hash = crypto.createHash('sha256').update(expectedAccessKey).digest();
      if (crypto.timingSafeEqual(keyHash, exp2Hash)) {
        isValid = true;
      }
    }
  }

  // Replay Attack Defense Wall:
  // If timestamp header or body field is provided, reject replays older than 5 minutes (300,000 ms)
  const webhookTimestamp = req.headers['x-webhook-timestamp'] || req.headers['x-timestamp'] || req.body?.timestamp;
  if (webhookTimestamp) {
    const parsedTs = new Date(webhookTimestamp).getTime();
    if (!isNaN(parsedTs)) {
      const timeDiff = Math.abs(Date.now() - parsedTs);
      if (timeDiff > 300000) {
        console.warn(`[AppSheet Webhook Replay Rejection] Stale timestamp: ${webhookTimestamp} (diff: ${timeDiff}ms)`);
        return res.status(401).json({
          status: 'fail',
          code: 'WEBHOOK_REPLAY_DETECTED',
          error: 'Webhook request expired or replay attack detected.',
        });
      }
    }
  }

  // Allow localhost / internal automated loopback during development ONLY if no key was provided at all
  if (!isValid && !apiKey && process.env.NODE_ENV !== 'production' && (clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp === 'unknown')) {
    isValid = true;
  }

  if (!isValid) {
    console.warn(
      `[AppSheet Webhook Auth Rejection] IP: ${clientIp} | Timestamp: ${new Date().toISOString()} | Path: ${req.originalUrl}`
    );
    return res.status(401).json({
      status: 'fail',
      error: 'Unauthorized: Invalid or missing X-AppSheet-Key or ApplicationAccessKey header.',
    });
  }

  next();
}

module.exports = appsheetAuth;
