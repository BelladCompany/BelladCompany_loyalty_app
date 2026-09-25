require('dotenv').config();
const { pool } = require('../src/config/db');

async function checkColumns() {
  const client = await pool.connect();
  try {
    const stCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sale_transactions';`);
    console.log('--- sale_transactions COLUMNS ---');
    console.log(stCols.rows.map((r) => `${r.column_name} (${r.data_type})`).join(', '));

    const vCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vehicles';`);
    console.log('\n--- vehicles COLUMNS ---');
    console.log(vCols.rows.map((r) => `${r.column_name} (${r.data_type})`).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}
checkColumns().catch(console.error);
