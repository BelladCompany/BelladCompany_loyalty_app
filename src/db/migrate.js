const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  const client = await pool.connect();
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    await client.query('BEGIN');

    for (const file of files) {
      console.log(`- Executing migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
    }

    await client.query('COMMIT');
    console.log('✅ All migrations applied successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
