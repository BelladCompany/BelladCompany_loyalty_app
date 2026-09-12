// scripts/inspect-points-ledger-cols.js
const { pool } = require('../src/config/db');

async function inspectCols() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'points_ledger';
  `);
  console.log('Columns in points_ledger:', res.rows);
  await pool.end();
}

inspectCols();
