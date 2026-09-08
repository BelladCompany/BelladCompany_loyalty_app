require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const INSECURE_DEFAULT = 'super_secret_jwt_key_change_in_production';
const jwtSecret = process.env.JWT_SECRET || INSECURE_DEFAULT;
const realbooksApiKey = process.env.REALBOOKS_API_KEY || 'rb_live_demo_key';
const dbPassword = process.env.DB_PASSWORD || 'postgres';

// Fail-safe production guards: never start a production server with known
// insecure default secrets. These checks only ADD restrictions; they do not
// weaken existing behavior in development.
if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === INSECURE_DEFAULT) {
    throw new Error(
      'JWT_SECRET must be set to a strong, unique value in production. Refusing to start with an insecure default secret.'
    );
  }
  if (!process.env.DATABASE_URL && (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'postgres')) {
    throw new Error(
      'DB_PASSWORD (or DATABASE_URL) must be set to a non-default value in production. Refusing to start with an insecure default.'
    );
  }
}

const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  defaultTenantId: process.env.DEFAULT_TENANT_ID || 'BAC-MAIN',
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
