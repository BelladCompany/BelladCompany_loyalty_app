const crypto = require('crypto');

/**
 * Enterprise Web Application Firewall (WAF) & Request Security Inspector
 * Protects financial transactions, APIs, and database from:
 *  1. SQL Injection (SQLi)
 *  2. Cross-Site Scripting (XSS)
 *  3. Path Traversal & LFI
 *  4. Remote Command Injection (RCE)
 *  5. Prototype Pollution & Key Poisoning
 *  6. Dangerous HTTP Verbs & Header Tampering
 */

// Targeted attack signatures
const SQLI_PATTERNS = [
  /\bunion\s+(?:all\s+)?select\b/i,
  /\bselect\s+.*\s+from\s+.*\bwhere\b/i,
  /\b(?:drop|truncate|alter)\s+table\b/i,
  /\b(?:sleep|benchmark)\s*\(\s*\d+\s*\)/i,
  /\bwaitfor\s+delay\s+['"]\d+/i,
  /\bexec(?:ute)?\s*\(\s*(?:xp_|sp_|cmd)/i,
  /(?:'|%27)\s*(?:or|and)\s*(?:'|%27)?\d+(?:'|%27)?\s*=\s*(?:'|%27)?\d+/i,
  /(?:'|%27)\s*or\s*(?:'|%27)1(?:'|%27)\s*=\s*(?:'|%27)1/i,
  /(?:--|\/\*|\*\/)\s*$/i,
];

const XSS_PATTERNS = [
  /<\s*script[^>]*>/i,
  /<\s*\/\s*script\s*>/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
  /<(?:iframe|object|embed|applet)\b/i,
  /<svg[^>]*\bonload\s*=/i,
  /\bon(?:error|load|click|mouseover|submit)\s*=\s*['"][^'"]*['"]/i,
];

const PATH_TRAVERSAL_PATTERNS = [
  /(?:\.\.[\/\\]|\.\.%2f|\.\.%5c|%2e%2e[\/\\]|%2e%2e%2f|%2e%2e%5c)/i,
  /\/etc\/(?:passwd|shadow|hosts)\b/i,
  /c:[\\\/]windows[\\\/]system32/i,
];

const COMMAND_INJECTION_PATTERNS = [
  /[;&|`]\s*(?:rm\s+-rf|del\s+\/[fq]|format\s+[a-z]:|powershell\s+-enc|cmd\.exe\s+\/c|bash\s+-i|nc\s+-e)/i,
  /\$\(\s*(?:whoami|id|cat\s+\/etc)/i,
];

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively inspects values for malicious patterns
 */
function inspectValue(val, path = '') {
  if (val == null) return null;

  if (typeof val === 'string') {
    // 1. Check SQLi
    for (const pat of SQLI_PATTERNS) {
      if (pat.test(val)) {
        return { type: 'SQL_INJECTION', path, match: val.slice(0, 50) };
      }
    }
    // 2. Check XSS
    for (const pat of XSS_PATTERNS) {
      if (pat.test(val)) {
        return { type: 'CROSS_SITE_SCRIPTING', path, match: val.slice(0, 50) };
      }
    }
    // 3. Check Path Traversal
    for (const pat of PATH_TRAVERSAL_PATTERNS) {
      if (pat.test(val)) {
        return { type: 'PATH_TRAVERSAL', path, match: val.slice(0, 50) };
      }
    }
    // 4. Check Command Injection
    for (const pat of COMMAND_INJECTION_PATTERNS) {
      if (pat.test(val)) {
        return { type: 'COMMAND_INJECTION', path, match: val.slice(0, 50) };
      }
    }
    return null;
  }

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      const threat = inspectValue(val[i], `${path}[${i}]`);
      if (threat) return threat;
    }
    return null;
  }

  if (typeof val === 'object') {
    for (const key of Object.keys(val)) {
      if (FORBIDDEN_KEYS.has(key)) {
        return { type: 'PROTOTYPE_POLLUTION', path: `${path}.${key}`, match: key };
      }
      const threat = inspectValue(val[key], `${path}.${key}`);
      if (threat) return threat;
    }
  }

  return null;
}

/**
 * Firewall Middleware
 */
function firewallMiddleware(req, res, next) {
  // 1. Block dangerous or unexpected HTTP methods
  const method = (req.method || '').toUpperCase();
  const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
  if (!allowedMethods.has(method)) {
    return res.status(405).json({
      status: 'fail',
      code: 'HTTP_METHOD_NOT_ALLOWED',
      error: `HTTP method ${method} is blocked by security firewall.`,
    });
  }

  // 2. Enforce maximum URL length to prevent buffer overruns
  if (req.originalUrl && req.originalUrl.length > 4096) {
    return res.status(414).json({
      status: 'fail',
      code: 'URI_TOO_LONG',
      error: 'Requested URI exceeds maximum allowed length.',
    });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // 3. Inspect Query Parameters
  if (req.query && typeof req.query === 'object') {
    const queryThreat = inspectValue(req.query, 'query');
    if (queryThreat) {
      console.warn(
        `🛡️ [FIREWALL BLOCKED] Type: ${queryThreat.type} | Path: ${req.path} | Param: ${queryThreat.path} | IP: ${clientIp}`
      );
      return res.status(403).json({
        status: 'fail',
        code: 'SECURITY_FIREWALL_BLOCK',
        error: 'Request blocked by security firewall. Malicious pattern detected.',
        threat_type: queryThreat.type,
      });
    }
  }

  // 4. Inspect Request Body (skip multipart file buffers if handled by multer downstream)
  if (req.body && typeof req.body === 'object') {
    // Check raw serialized body for prototype pollution attempts that JSON.parse obscures
    try {
      const rawStr = JSON.stringify(req.body);
      if (rawStr && (rawStr.includes('"__proto__"') || rawStr.includes('__proto__'))) {
        console.warn(`🛡️ [FIREWALL BLOCKED] Type: PROTOTYPE_POLLUTION | Path: ${req.path} | IP: ${clientIp}`);
        return res.status(403).json({
          status: 'fail',
          code: 'SECURITY_FIREWALL_BLOCK',
          error: 'Request blocked by security firewall. Malicious prototype pollution payload detected.',
          threat_type: 'PROTOTYPE_POLLUTION',
        });
      }
    } catch (e) {}

    const bodyThreat = inspectValue(req.body, 'body');
    if (bodyThreat) {
      console.warn(
        `🛡️ [FIREWALL BLOCKED] Type: ${bodyThreat.type} | Path: ${req.path} | Field: ${bodyThreat.path} | IP: ${clientIp}`
      );
      return res.status(403).json({
        status: 'fail',
        code: 'SECURITY_FIREWALL_BLOCK',
        error: 'Request blocked by security firewall. Malicious payload detected.',
        threat_type: bodyThreat.type,
      });
    }
  }

  // 5. Inspect suspicious header injections
  const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
  for (const hdr of suspiciousHeaders) {
    const val = req.headers[hdr];
    if (val && typeof val === 'string') {
      const threat = inspectValue(val, `header.${hdr}`);
      if (threat) {
        return res.status(403).json({
          status: 'fail',
          code: 'SECURITY_FIREWALL_BLOCK',
          error: 'Security headers inspection failed.',
        });
      }
    }
  }

  next();
}

module.exports = firewallMiddleware;
