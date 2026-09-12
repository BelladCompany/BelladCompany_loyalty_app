// scripts/inspect-ledger-constraints.js
const { pool } = require('../src/config/db');

async function inspect() {
  const res = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'points_ledger'::regclass;
  `);
  console.log('Constraints on points_ledger:', res.rows);
  await pool.end();
}

inspect();
