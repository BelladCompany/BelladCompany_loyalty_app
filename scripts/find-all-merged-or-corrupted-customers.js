// scripts/find-all-merged-or-corrupted-customers.js
const { pool } = require('../src/config/db');

async function checkCorruptedCustomers() {
  console.log('--- Inspecting PostgreSQL for incorrectly merged customer profiles ---');

  // Query vehicles joined with customers to check if vehicle firm_name / sales details or names conflict
  const res = await pool.query(`
    SELECT c.customer_id, c.customer_name, c.aadhaar_number,
           COUNT(v.vehicle_id) AS vehicle_count,
           STRING_AGG(DISTINCT v.chassis_no, ', ') AS chassis_list,
           STRING_AGG(DISTINCT v.model, ', ') AS model_list,
           STRING_AGG(DISTINCT v.dms_invoice_number, ', ') AS invoice_list
    FROM customers c
    JOIN vehicles v ON c.customer_id = v.customer_id
    GROUP BY c.customer_id, c.customer_name, c.aadhaar_number
    HAVING COUNT(v.vehicle_id) > 1;
  `);

  console.log(`Found ${res.rows.length} customers with multiple vehicles.`);
  console.log(JSON.stringify(res.rows.slice(0, 15), null, 2));

  // Query customer_phones for customer_ids associated with multiple distinct Aadhaar numbers or names
  const phoneRes = await pool.query(`
    SELECT p.phone_number, COUNT(DISTINCT p.customer_id) AS cust_count,
           STRING_AGG(DISTINCT c.customer_name, ' | ') AS names
    FROM customer_phones p
    JOIN customers c ON p.customer_id = c.customer_id
    GROUP BY p.phone_number
    HAVING COUNT(DISTINCT p.customer_id) > 1;
  `);

  console.log(`Found ${phoneRes.rows.length} phone numbers linked to multiple distinct customer_ids.`);
  console.log(JSON.stringify(phoneRes.rows, null, 2));

  await pool.end();
}

checkCorruptedCustomers();
