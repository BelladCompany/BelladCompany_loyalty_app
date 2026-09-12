const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../src/db/migrations/017_add_vin_form_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying Migration 017...');
    await pool.query(sql);
    console.log('✅ Migration 017 applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration 017 failed:', err.message || err);
    process.exit(1);
  }
}

runMigration();
