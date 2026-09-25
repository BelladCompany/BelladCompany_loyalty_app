require('dotenv').config();
const { pool } = require('../src/config/db');

async function checkDb() {
  const client = await pool.connect();
  try {
    const vRes = await client.query(`SELECT * FROM vehicles WHERE vin = 'MAT634169TPFA5334' OR registration_number = 'KA51NA7534';`);
    console.log('--- DB VEHICLES ---');
    console.log(vRes.rows);

    const stRes = await client.query(`SELECT * FROM sale_transactions WHERE reference_id = 'B1E03367' OR vehicle_id IN (SELECT vehicle_id FROM vehicles WHERE vin = 'MAT634169TPFA5334');`);
    console.log('--- DB SALE TRANSACTIONS ---');
    console.log(stRes.rows);

    const plRes = await client.query(`SELECT * FROM points_ledger WHERE source_ref = 'B1E03367' OR vehicle_id IN (SELECT vehicle_id FROM vehicles WHERE vin = 'MAT634169TPFA5334');`);
    console.log('--- DB POINTS LEDGER ---');
    console.log(plRes.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDb().catch(console.error);
