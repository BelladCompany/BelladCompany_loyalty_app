// scripts/inspect-db-vehicle-details.js
const { pool } = require('../src/config/db');

async function inspectVehicles() {
  const vehRes = await pool.query(
    `SELECT v.*, c.customer_name, c.aadhaar_number, c.age, c.address
     FROM vehicles v
     LEFT JOIN customers c ON v.customer_id = c.customer_id
     WHERE v.chassis_no ILIKE '%MYHABFCB7TBF06740%' OR v.chassis_no ILIKE '%TEST VIN%';`
  );
  console.log('Vehicles details in DB:', vehRes.rows);

  await pool.end();
}

inspectVehicles();
