require('dotenv').config();
const { pool } = require('./src/config/db');

async function main() {
  try {
    const res = await pool.query('SELECT customer_id, customer_name, aadhaar_number FROM customers LIMIT 10;');
    console.log('Customer count:', res.rowCount);
    console.log(JSON.stringify(res.rows, null, 2));

    const checkRahul = await pool.query("SELECT * FROM customers WHERE customer_name ILIKE '%rahul%';");
    console.log('Rahul in DB:', checkRahul.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
