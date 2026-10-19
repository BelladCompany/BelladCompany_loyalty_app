const { Pool } = require('pg');
const env = require('./env');

const connectionString = env.db.connectionString;
const isProduction = env.nodeEnv === 'production';
const isLocalOrContainer = Boolean(
  connectionString &&
    (connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('@postgres:'))
);

const isRemoteDb = Boolean(connectionString && !isLocalOrContainer);

const useSsl =
  process.env.DB_SSL === 'false'
    ? false
    : process.env.DB_SSL === 'true'
    ? true
    : Boolean(
        (isProduction || isRemoteDb) &&
          !isLocalOrContainer &&
          !connectionString?.includes('sslmode=disable')
      );

const poolOptions = {
  max: parseInt(process.env.DB_POOL_MAX || '25', 10),
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
};

const poolConfig = connectionString
  ? {
      connectionString,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      ...poolOptions,
    }
  : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      ...poolOptions,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
