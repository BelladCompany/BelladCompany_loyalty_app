/**
 * Database Backup & Verification Tool
 * automobile-loyalty-backend
 *
 * Role: Principal Architect / QA Lead
 * Purpose: Generates structured database snapshot backups before any migration or DB mutation.
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function createBackup() {
  console.log('📦 Starting Database Snapshot Backup...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `db_snapshot_${timestamp}.json`);
  const client = await pool.connect();

  try {
    const backupData = {
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      tables: {},
    };

    // Export core tables to snapshot
    const tables = [
      'firms',
      'branches',
      'brands',
      'models',
      'users',
      'customers',
      'vehicles',
      'points_ledger',
      'schema_migrations',
    ];

    for (const table of tables) {
      try {
        const res = await client.query(`SELECT * FROM ${table};`);
        backupData.tables[table] = res.rows;
        console.log(`  ✓ Backed up table '${table}': ${res.rows.length} rows`);
      } catch (err) {
        console.warn(`  ⚠️ Table '${table}' could not be backed up: ${err.message}`);
      }
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`\n✅ Backup snapshot saved successfully: ${backupFile}`);
    console.log(`   Total Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB\n`);
    return backupFile;
  } catch (err) {
    console.error('❌ Backup Failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  createBackup()
    .then(() => pool.end())
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}

module.exports = createBackup;
