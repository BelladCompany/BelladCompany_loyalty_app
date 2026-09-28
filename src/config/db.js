const { Pool } = require('pg');
const env = require('./env');

const connectionString = env.db.connectionString;
const isProduction = env.nodeEnv === 'production';
const isRemoteDb = Boolean(
  connectionString &&
    !connectionString.includes('localhost') &&
    !connectionString.includes('127.0.0.1')
);

const useSsl = isProduction || isRemoteDb;

const poolConfig = connectionString
  ? {
      connectionString,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    }
  : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
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
