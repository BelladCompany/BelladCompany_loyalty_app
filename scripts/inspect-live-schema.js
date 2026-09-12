const { pool } = require('../src/config/db');

async function inspectColumns() {
  const tables = ['vehicles', 'customer_phones', 'users', 'customers', 'points_ledger'];
  for (const t of tables) {
    const res = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position;`,
      [t]
    );
    console.log(`=== TABLE: ${t} ===`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }
  await pool.end();
}

inspectColumns().catch(console.error);
