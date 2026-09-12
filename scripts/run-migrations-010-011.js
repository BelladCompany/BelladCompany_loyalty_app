const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runPhase1And2() {
  console.log('🔄 Executing Phase 1 and Phase 2 migrations (010 & 011)...');
  const client = await pool.connect();
  try {
    const file10 = path.join(__dirname, '../src/db/migrations/010_phase1_foundation.sql');
    const sql10 = fs.readFileSync(file10, 'utf8');
    console.log('Executing 010_phase1_foundation.sql...');
    await client.query(sql10);
    console.log('✅ 010_phase1_foundation.sql applied successfully!');

    const file11 = path.join(__dirname, '../src/db/migrations/011_phase2_transactions.sql');
    const sql11 = fs.readFileSync(file11, 'utf8');
    console.log('Executing 011_phase2_transactions.sql...');
    await client.query(sql11);
    console.log('✅ 011_phase2_transactions.sql applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase1And2();
