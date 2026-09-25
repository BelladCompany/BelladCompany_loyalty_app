const { pool } = require('../src/config/db');

async function check() {
  const res = await pool.query(
    `SELECT vehicle_id, vin, registration_number, model, variant, ex_showroom_price
     FROM vehicles
     WHERE ex_showroom_price IS NOT NULL
     ORDER BY vehicle_id DESC
     LIMIT 5;`
  );
  console.log('--- 5 REAL VEHICLES IN DB ---');
  res.rows.forEach((r, i) => {
    console.log(`[${i + 1}] ID: ${r.vehicle_id} | VIN: ${r.vin} | Model: ${r.model} (${r.variant || 'N/A'}) | Ex-Showroom: ₹${(Number(r.ex_showroom_price) / 100).toLocaleString('en-IN')}`);
  });
  await pool.end();
}

check();
