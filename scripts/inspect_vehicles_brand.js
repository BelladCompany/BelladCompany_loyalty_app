const { pool } = require('../src/config/db');

async function run() {
  try {
    const vRes = await pool.query(`
      SELECT vehicle_id, customer_id, model, brand_name, firm_name, branch_name, branch_id
      FROM vehicles
      ORDER BY vehicle_id DESC
      LIMIT 15;
    `);
    console.log('Sample vehicles in DB:');
    console.table(vRes.rows);

    const brandsRes = await pool.query(`
      SELECT DISTINCT brand_name FROM vehicles;
    `);
    console.log('Distinct brand_names in vehicles:');
    console.table(brandsRes.rows);

    const modelsRes = await pool.query(`
      SELECT DISTINCT model, brand_name FROM vehicles LIMIT 20;
    `);
    console.log('Distinct models in vehicles:');
    console.table(modelsRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
