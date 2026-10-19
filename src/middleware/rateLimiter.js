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

/**
 * Rate limiter for OTP requests (e.g. login OTP, creation OTP, redemption OTP)
 * Max 5 requests per 10 minutes per IP/phone to protect against SMS pumping and denial-of-service
 */
const otpRequestCounts = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of otpRequestCounts.entries()) {
    if (now > data.resetTime) {
      otpRequestCounts.delete(key);
    }
  }
}, 10 * 60 * 1000);

const otpRequestRateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const phone = req.body?.phone || req.body?.phone_number || '';
  const key = `${clientIp}:${phone}`;
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;

  const current = otpRequestCounts.get(key);
  if (!current || now > current.resetTime) {
    otpRequestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      status: 'fail',
      error: 'Too many OTP requests. For your security, please wait 10 minutes before requesting again.',
    });
  }

  current.count += 1;
  next();
};

/**
 * Rate limiter for OTP verification & redemption to prevent brute-forcing 6-digit codes
 * Max 10 verification attempts per 10 minutes per IP
 */
const otpVerifyCounts = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of otpVerifyCounts.entries()) {
    if (now > data.resetTime) {
      otpVerifyCounts.delete(key);
    }
  }
}, 10 * 60 * 1000);

const otpVerifyRateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 10;

  const current = otpVerifyCounts.get(clientIp);
  if (!current || now > current.resetTime) {
    otpVerifyCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      status: 'fail',
      error: 'Too many failed verification attempts. Please wait 10 minutes before trying again.',
    });
  }

  current.count += 1;
  next();
};

/**
 * Rate limiter for customer searches to prevent mass customer data scraping
 * Max 60 searches per minute per IP
 */
const searchRequestCounts = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of searchRequestCounts.entries()) {
    if (now > data.resetTime) {
      searchRequestCounts.delete(ip);
    }
  }
}, 60 * 1000);

const searchRateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  const current = searchRequestCounts.get(clientIp);
  if (!current || now > current.resetTime) {
    searchRequestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      status: 'fail',
      error: 'Rate limit exceeded: Too many search requests. Please slow down.',
    });
  }

  current.count += 1;
  next();
};

/**
 * Rate limiter for gift card PIN lookup / claims to prevent brute forcing 4-digit security PINs
 * Max 10 attempts per 5 minutes per IP
 */
const giftCardRequestCounts = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of giftCardRequestCounts.entries()) {
    if (now > data.resetTime) {
      giftCardRequestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const giftCardRateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 10;

  const current = giftCardRequestCounts.get(clientIp);
  if (!current || now > current.resetTime) {
    giftCardRequestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      status: 'fail',
      error: 'Security rate limit: Too many gift card lookup/claim attempts. Please try again in 5 minutes.',
    });
  }

  current.count += 1;
  next();
};

/**
 * Global general API rate limiter to protect infrastructure scalability (300 requests/minute per IP)
 */
const globalApiRequestCounts = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of globalApiRequestCounts.entries()) {
    if (now > data.resetTime) {
      globalApiRequestCounts.delete(ip);
    }
  }
}, 60 * 1000);

const globalApiRateLimiter = (req, res, next) => {
  // Exclude static assets and health check
  if (req.path === '/health' || req.path.startsWith('/client') || req.path.startsWith('/assets')) {
    return next();
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 300;

  const current = globalApiRequestCounts.get(clientIp);
  if (!current || now > current.resetTime) {
    globalApiRequestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      status: 'fail',
      error: 'High traffic detected: Too many requests from your IP. Please try again shortly.',
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
loginRateLimiter.otpRequestRateLimiter = otpRequestRateLimiter;
loginRateLimiter.otpVerifyRateLimiter = otpVerifyRateLimiter;
loginRateLimiter.searchRateLimiter = searchRateLimiter;
loginRateLimiter.giftCardRateLimiter = giftCardRateLimiter;
loginRateLimiter.globalApiRateLimiter = globalApiRateLimiter;

module.exports = loginRateLimiter;