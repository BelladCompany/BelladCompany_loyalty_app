const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../src/db/migrations/018_add_aadhaar_number_and_fuel_type.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying Migration 018...');
    await pool.query(sql);
    console.log('✅ Migration 018 applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration 018 failed:', err.message || err);
    process.exit(1);
  }
}

runMigration();
