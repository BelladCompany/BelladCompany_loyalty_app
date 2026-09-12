const crypto = require('crypto');

/**
 * Middleware that validates the static shared-secret header (X-AppSheet-Key) sent by AppSheet
 * against the env var APPSHEET_WEBHOOK_KEY using constant-time comparison (crypto.timingSafeEqual).
 */
function appsheetAuth(req, res, next) {
  const apiKey = req.headers['x-appsheet-key'];
  const expectedKey = process.env.APPSHEET_WEBHOOK_KEY || 'appsheet_secret_key_default_2026';
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  let isValid = false;

  if (apiKey && typeof apiKey === 'string') {
    const keyBuffer = Buffer.from(apiKey);
    const expectedBuffer = Buffer.from(expectedKey);

    if (keyBuffer.length === expectedBuffer.length) {
      isValid = crypto.timingSafeEqual(keyBuffer, expectedBuffer);
    }
  }

  if (!isValid) {
    console.warn(
      `[AppSheet Webhook Auth Rejection] IP: ${clientIp} | Timestamp: ${new Date().toISOString()} | Path: ${req.originalUrl}`
    );
    return res.status(401).json({
      status: 'fail',
      error: 'Unauthorized: Invalid or missing X-AppSheet-Key header.',
    });
  }

  next();
}

module.exports = appsheetAuth;
