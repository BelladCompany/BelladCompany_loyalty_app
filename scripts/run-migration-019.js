// scripts/run-migration-019.js
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Running Migration 019: Adding receipt_no and account_ledger_no...');
    const sqlPath = path.join(__dirname, '../src/db/migrations/019_add_receipt_and_account_ledger_no.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    console.log('Migration 019 completed successfully.');
  } catch (err) {
    console.error('Migration 019 failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
