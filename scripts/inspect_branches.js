const { pool } = require('../src/config/db');

async function run() {
  try {
    const res = await pool.query(`
      SELECT branch_id, id, branch_name, name, branch_city, city, brand, code 
      FROM branches 
      ORDER BY branch_id;
    `);
    console.log(`Found ${res.rows.length} branches in branches table:`);
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
