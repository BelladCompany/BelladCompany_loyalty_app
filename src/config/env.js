const crypto = require('crypto');
require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const INSECURE_DEFAULT = 'super_secret_jwt_key_change_in_production';
let jwtSecret = process.env.JWT_SECRET;

// Fail-safe production handling: if JWT_SECRET is missing or default in production,
// auto-generate a cryptographically secure 256-bit random key so the server never crashes on boot.
if (!jwtSecret || jwtSecret === INSECURE_DEFAULT) {
  if (isProduction) {
    console.warn(
      '⚠️ WARNING: JWT_SECRET was not configured or matches default. Generated an ephemeral cryptographically strong secret for this process.'
    );
    jwtSecret = crypto.randomBytes(32).toString('hex');
  } else {
    jwtSecret = INSECURE_DEFAULT;
  }
}

const realbooksApiKey = process.env.REALBOOKS_API_KEY || 'rb_live_demo_key';
const dbPassword = process.env.DB_PASSWORD || 'postgres';

if (isProduction) {
  if (!process.env.DATABASE_URL && (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'postgres')) {
    console.warn(
      '⚠️ WARNING: Neither DATABASE_URL nor custom DB_PASSWORD is set in production. Database connection may fail if PostgreSQL requires credentials.'
    );
  }
}

const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  defaultTenantId: process.env.DEFAULT_TENANT_ID || 'bellad_and_company',
  realbooksApiUrl: process.env.REALBOOKS_API_URL || 'https://api.realbooks.in/v1/redemptions',
  realbooksApiKey,
  db: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: dbPassword,
    database: process.env.DB_NAME || 'loyalty_db',
  }
};

if (isProduction && !process.env.REALBOOKS_API_KEY) {
  console.warn(
    '⚠️ WARNING: REALBOOKS_API_KEY is not set. RealBooks redemption syncs will use the mock client until a real API key is provided.'
  );
}

// Production feedback: prevent accidental use of known default secrets downstream
if (isProduction && env.realbooksApiKey === 'rb_live_demo_key') {
  console.warn('⚠️ WARNING: REALBOOKS_API_KEY is still the insecure demo default. Set a real key before going live.');
}

module.exports = env;
