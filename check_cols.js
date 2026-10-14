require('dotenv').config();
const { pool } = require('./src/config/db');

async function testCols() {
  const c1 = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'customer_tier_snapshot';
  `);
  console.log('customer_tier_snapshot cols:', c1.rows);

  const c2 = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'points_ledger';
  `);
  console.log('points_ledger cols:', c2.rows);

  await pool.end();
}
testCols();
