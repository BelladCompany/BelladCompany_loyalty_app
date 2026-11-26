const { pool } = require('../src/config/db');

async function run() {
  try {
    const res = await pool.query(`
      SELECT id, cid, segid, company_name, firm_name, brand, city, category_type, is_txn_allowed, sname, name 
      FROM realbooks_segments 
      WHERE brand IN ('TATA MOTORS', 'MG MOTORS', 'Hyundai', 'ATHER ENERGY', 'Hero', 'Vida', 'Swaraj')
      ORDER BY brand, city, category_type;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
