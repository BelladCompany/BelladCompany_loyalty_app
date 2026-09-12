const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runMigration012() {
  console.log('🔄 Executing Phase 4 migration 012_phase4_referral_slabs.sql...');
  const client = await pool.connect();
  try {
    const file12 = path.join(__dirname, '../src/db/migrations/012_phase4_referral_slabs.sql');
    const sql12 = fs.readFileSync(file12, 'utf8');
    await client.query(sql12);
    console.log('✅ 012_phase4_referral_slabs.sql applied successfully!');
  } catch (error) {
    console.error('❌ Migration 012 failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration012();
