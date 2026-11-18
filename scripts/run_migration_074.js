const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '../src/db/migrations/074_add_ather_tata_mg_realbooks_segments.sql'), 'utf8');
  console.log('Running migration 074...');
  await pool.query(sql);

  const countRes = await pool.query('SELECT count(*) FROM realbooks_segments;');
  console.log('✅ Migration 074 completed. Total realbooks_segments rows:', countRes.rows[0].count);
  await pool.end();
}

run().catch(console.error);
