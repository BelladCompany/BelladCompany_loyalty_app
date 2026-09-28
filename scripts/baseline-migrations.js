require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function baselineMigrations() {
  const rawApply = process.env.APPLY ? String(process.env.APPLY).trim() : '';
  const isApply = rawApply === '1' || rawApply.toLowerCase() === 'true';

  const connectionString = process.env.DATABASE_URL;
  let poolConfig;

  if (connectionString) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    poolConfig = {
      connectionString,
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
    };
  } else {
    const env = require('../src/config/env');
    const dbConnStr = env.db.connectionString;
    if (dbConnStr) {
      const isLocal = dbConnStr.includes('localhost') || dbConnStr.includes('127.0.0.1');
      poolConfig = {
        connectionString: dbConnStr,
        ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
      };
    } else {
      const host = env.db.host || 'localhost';
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      poolConfig = {
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
        database: env.db.database,
        ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
      };
    }
  }

  const pool = new Pool(poolConfig);
  const client = await pool.connect();

  try {
    const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration file(s) in ${migrationsDir}`);

    if (!isApply) {
      console.log('\n--- DRY RUN MODE (Default) ---');
      console.log('No database modifications will be performed.');
      console.log('To apply the baseline, run with environment variable APPLY=1\n');
      console.log('The following migration files would be inserted into schema_migrations:');
      files.forEach((file) => console.log(`  - ${file}`));
      return;
    }

    console.log('\n--- APPLY MODE (APPLY=1) ---');
    console.log('Ensuring schema_migrations table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    let insertedCount = 0;
    for (const file of files) {
      const res = await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING;',
        [file]
      );
      if (res.rowCount > 0) {
        insertedCount++;
        console.log(`  [+] Baseline added: ${file}`);
      } else {
        console.log(`  [-] Already tracked: ${file}`);
      }
    }

    console.log(`\n✅ Baseline complete! Inserted ${insertedCount} file(s) into schema_migrations.`);
  } catch (error) {
    console.error('❌ Baseline script failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

baselineMigrations();
