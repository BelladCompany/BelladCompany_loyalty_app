const crypto = require('crypto');

// 32-byte secret key for AES-256-GCM encryption at rest
const ENCRYPTION_KEY_RAW = process.env.KYC_ENCRYPTION_KEY || 'bac_loyalty_kyc_encryption_key_32b_secret';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a string (e.g. file URL reference) at rest using AES-256-GCM
 */
function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  // If not encrypted format (doesn't contain 2 colons), return raw text
  if (!encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return encryptedText;
  }
}

/**
 * Deterministic HMAC-SHA256 hashing for unique identifiers (e.g., Aadhaar number).
 * Same input produces the exact same hash output every time for equality matching.
 */
function hashIdentifier(value) {
  if (!value) return null;
  const pepper = process.env.AADHAAR_PEPPER || process.env.KYC_ENCRYPTION_KEY || 'bac_loyalty_aadhaar_pepper_secret_32b';
  return crypto.createHmac('sha256', pepper).update(String(value).trim()).digest('hex');
}

/**
 * Returns the last N digits of a numeric or string identifier for masked display.
 */
function lastDigits(value, n = 4) {
  if (!value) return null;
  const str = String(value).trim();
  return str.slice(-n);
}

module.exports = {
  encrypt,
  decrypt,
  hashIdentifier,
  lastDigits,
};
