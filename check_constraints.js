require('dotenv').config();
const { pool } = require('./src/config/db');

async function testConstraints() {
  const c1 = await pool.query(`
    SELECT conname, contype, relname 
    FROM pg_constraint c 
    JOIN pg_class t ON c.conrelid = t.oid 
    WHERE t.relname IN ('customer_phones', 'customer_tiers', 'vehicles');
  `);
  console.log(c1.rows);
  await pool.end();
}
testConstraints();
