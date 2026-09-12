const { pool } = require('../config/db');

/**
 * IP rate limiter for login requests (max 10 attempts per 15 minutes per IP)
 */
const loginIpRequestCounts = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginIpRequestCounts.entries()) {
    if (now > data.resetTime) {
      loginIpRequestCounts.delete(ip);
    }
  }
}, 15 * 60 * 1000);

const loginRateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 10;

  const current = loginIpRequestCounts.get(clientIp);

  if (!current || now > current.resetTime) {
    loginIpRequestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      status: 'fail',
      error: 'Too many login attempts from this IP. Please try again in 15 minutes.',
    });
  }

  current.count += 1;
  next();
};

/**
 * Middleware enforcing max 3 KYC change requests per customer per 24 hours
 */
const kycRateLimiter = async (req, res, next) => {
  try {
    const customerId = req.params.id || req.body.customer_id;
    const tenantId = req.tenantId || 'bellad_and_company';

    if (!customerId) {
      return next();
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) AS request_count
       FROM kyc_change_requests
       WHERE customer_id = $1 AND tenant_id = $2 AND created_at >= NOW() - INTERVAL '24 hours';`,
      [customerId, tenantId]
    );

    const requestCount = parseInt(countRes.rows[0].request_count, 10);

    if (requestCount >= 3) {
      return res.status(429).json({
        status: 'fail',
        error: 'Rate limit exceeded: A maximum of 3 KYC change requests per 24 hours is allowed per customer.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * In-memory IP rate limiter for public balance pass requests (max 30 requests per 1 minute per IP)
 */
const ipRequestCounts = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now > data.resetTime) {
      ipRequestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const publicBalanceRateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;

  const current = ipRequestCounts.get(clientIp);

  if (!current || now > current.resetTime) {
    ipRequestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      status: 'fail',
      error: 'Rate limit exceeded: Too many requests for public balance pass. Please try again in a minute.',
    });
  }

  current.count += 1;
  next();
};

/**
 * In-memory IP rate limiter for AppSheet webhook requests (max 60 requests per 1 minute per IP)
 */
const appsheetIpRequestCounts = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of appsheetIpRequestCounts.entries()) {
    if (now > data.resetTime) {
      appsheetIpRequestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const appsheetRateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  const current = appsheetIpRequestCounts.get(clientIp);

  if (!current || now > current.resetTime) {
    appsheetIpRequestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      status: 'fail',
      error: 'Rate limit exceeded: Too many AppSheet webhook requests. Maximum 60 requests per minute allowed.',
    });
  }

  current.count += 1;
  next();
};

// Dual export support for backward compatibility with default import and named imports
loginRateLimiter.loginRateLimiter = loginRateLimiter;
loginRateLimiter.kycRateLimiter = kycRateLimiter;
loginRateLimiter.publicBalanceRateLimiter = publicBalanceRateLimiter;
loginRateLimiter.appsheetRateLimiter = appsheetRateLimiter;

module.exports = loginRateLimiter;