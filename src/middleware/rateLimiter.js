/**
 * Lightweight in-memory rate limiter for auth endpoints.
 * Keyed by a composite of (client IP, request key, request key value) to
 * throttle brute-force attempts without introducing new dependencies.
 *
 * NOTE: In-memory state is per-process and not shared across instances.
 * For a multi-instance production deployment replace this with a shared
 * store (e.g. Redis). See the production-deployment checklist in README.
 */
const slidingWindowMs = 15 * 60 * 1000; // 15 minutes
const maxAttempts = 10;

const attempts = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entries] of attempts) {
    const active = entries.filter((ts) => now - ts < slidingWindowMs);
    if (active.length === 0) {
      attempts.delete(key);
    } else {
      attempts.set(key, active);
    }
  }
}, 60 * 1000).unref();

function fail(msg, retryAfter) {
  const err = new Error(msg);
  err.statusCode = 429;
  err.retryAfter = retryAfter;
  return err;
}

/**
 * Rate-limits login attempts. Keys on the credentials-independent part of the
 * request (client IP) plus the username when provided. A failure to throttle
 * must never block legitimate traffic, so this is defensive hardening on top
 * of the existing OTP service-level limits.
 */
function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const username = (req.body && req.body.username) || 'unknown';
  const inputKey = `${ip}:${username}`.toLowerCase();

  const now = Date.now();
  const tryPrune = (map, key) => {
    const active = map.get(key);
    if (!active) return [];
    const fresh = active.filter((ts) => now - ts < slidingWindowMs);
    map.set(key, fresh);
    return fresh;
  };

  // Global per-IP budget
  const ipKey = `ip:${ip}`;
  const ipAttempts = tryPrune(attempts, ipKey);
  if (ipAttempts.length >= maxAttempts * 3) {
    return next(fail('Too many login attempts from this address. Please try again later.'));
  }

  // Per-IP+username budget
  const keyAttempts = tryPrune(attempts, inputKey);
  if (keyAttempts.length >= maxAttempts) {
    const retryAfter = Math.ceil((slidingWindowMs - (now - keyAttempts[keyAttempts.length - 1])) / 1000);
    res.set('Retry-After', String(retryAfter));
    return next(fail(`Too many login attempts. Please try again in ${retryAfter} seconds.`, retryAfter));
  }

  // Record attempt
  attempts.get(inputKey) ? attempts.get(inputKey).push(now) : attempts.set(inputKey, [now]);
  attempts.get(ipKey) ? attempts.get(ipKey).push(now) : attempts.set(ipKey, [now]);

  next();
}

module.exports = loginRateLimiter;