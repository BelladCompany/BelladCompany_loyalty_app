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

  const expectedWebhookKey = process.env.APPSHEET_WEBHOOK_KEY || 'appsheet_secret_key_default_2026';
  const expectedAccessKey = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  let isValid = false;

  if (apiKey && typeof apiKey === 'string') {
    const keyTrimmed = apiKey.trim();
    if (keyTrimmed === expectedWebhookKey || keyTrimmed === expectedAccessKey) {
      isValid = true;
    } else {
      // Constant-time check
      const keyBuffer = Buffer.from(keyTrimmed);
      const expectedBuffer1 = Buffer.from(expectedWebhookKey);
      if (keyBuffer.length === expectedBuffer1.length && crypto.timingSafeEqual(keyBuffer, expectedBuffer1)) {
        isValid = true;
      }
    }
  }

  // Allow localhost / internal automated loopback during development if no key provided
  if (!isValid && process.env.NODE_ENV !== 'production' && (clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp === 'unknown')) {
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
