const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixSequence() {
  try {
    const maxRes = await pool.query("SELECT MAX(CAST(SUBSTRING(customer_id FROM 5) AS INTEGER)) as max_val FROM customers WHERE customer_id LIKE 'BAC-%' AND customer_id ~ '^BAC-\\d+$'");
    const maxVal = maxRes.rows[0].max_val;
    console.log("Max customer ID:", maxVal);
    
    if (maxVal) {
      const newSeq = await pool.query(`SELECT setval('customer_id_seq', ${maxVal + 1}, false)`);
      console.log("Sequence updated to:", newSeq.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

fixSequence();
