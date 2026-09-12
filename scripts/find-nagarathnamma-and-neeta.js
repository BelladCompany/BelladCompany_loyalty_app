// scripts/find-nagarathnamma-and-neeta.js
const { pool } = require('../src/config/db');

async function findDetails() {
  console.log('--- Inspecting VIN MYHABFCB7TBF06740 and phones ---');

  const vRes = await pool.query(
    `SELECT * FROM vehicles WHERE chassis_no = 'MYHABFCB7TBF06740' OR vin = 'MYHABFCB7TBF06740';`
  );
  console.log('Vehicle MYHABFCB7TBF06740:', vRes.rows);

  const cRes = await pool.query(
    `SELECT * FROM customers WHERE customer_id = 'BAC-API2';`
  );
  console.log('Customer BAC-API2:', cRes.rows);

  const pRes = await pool.query(
    `SELECT * FROM customer_phones WHERE customer_id = 'BAC-API2';`
  );
  console.log('Phones for BAC-API2:', pRes.rows);

  const logRes = await pool.query(
    `SELECT payload FROM appsheet_pull_log WHERE payload::text ILIKE '%MYHABFCB7TBF06740%' LIMIT 2;`
  );
  if (logRes.rows.length > 0) {
    console.log('AppSheet Log for MYHABFCB7TBF06740:', logRes.rows[0].payload);
  } else {
    console.log('No AppSheet pull log found matching MYHABFCB7TBF06740');
  }

  await pool.end();
}

findDetails();
