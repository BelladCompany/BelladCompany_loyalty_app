// scripts/inspect-customer-bug.js
const { pool } = require('../src/config/db');

async function inspectBug() {
  console.log('--- Searching for NEETA SANJAY DEORE and Nagarathnamma ---');

  const custRes = await pool.query(
    `SELECT customer_id, customer_name, aadhaar_number, aadhaar_hash, age, address, created_at
     FROM customers
     WHERE customer_name ILIKE '%NEETA%' OR customer_name ILIKE '%Nagarathnamma%';`
  );
  console.log('Customers found:', custRes.rows);

  const phoneRes = await pool.query(
    `SELECT p.phone_id, p.customer_id, c.customer_name, p.phone_number, p.is_verified
     FROM customer_phones p
     JOIN customers c ON p.customer_id = c.customer_id
     WHERE c.customer_name ILIKE '%NEETA%' OR c.customer_name ILIKE '%Nagarathnamma%' OR p.phone_number IN (
       SELECT phone_number FROM customer_phones WHERE customer_id IN (
         SELECT customer_id FROM customers WHERE customer_name ILIKE '%NEETA%' OR customer_name ILIKE '%Nagarathnamma%'
       )
     );`
  );
  console.log('Customer Phones found:', phoneRes.rows);

  const vehRes = await pool.query(
    `SELECT v.vehicle_id, v.customer_id, c.customer_name, v.chassis_no, v.vin, v.model
     FROM vehicles v
     JOIN customers c ON v.customer_id = c.customer_id
     WHERE c.customer_name ILIKE '%NEETA%' OR c.customer_name ILIKE '%Nagarathnamma%' OR v.chassis_no ILIKE '%MYHABFCB7TBF06740%' OR v.chassis_no ILIKE '%TEST VIN%';`
  );
  console.log('Vehicles found:', vehRes.rows);

  await pool.end();
}

inspectBug();
