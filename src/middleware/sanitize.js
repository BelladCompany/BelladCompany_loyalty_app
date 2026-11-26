/**
 * Request Payload Sanitization Middleware
 * automobile-loyalty-backend
 *
 * Protects against Prototype Pollution, Object Injection, and Null-Byte attacks.
 */

function isDangerousKey(key) {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function cleanObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 10) return;

  for (const key of Object.keys(obj)) {
    if (isDangerousKey(key)) {
      delete obj[key];
      continue;
    }

    const val = obj[key];
    if (typeof val === 'string') {
      if (val.includes('\0')) {
        obj[key] = val.replace(/\0/g, '');
      }
    } else if (typeof val === 'object' && val !== null) {
      cleanObject(val, depth + 1);
    }
  }
}

function sanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    cleanObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    cleanObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    cleanObject(req.params);
  }
  next();
}

module.exports = sanitizeMiddleware;
