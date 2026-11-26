const { pool } = require('../src/config/db');

async function run() {
  try {
    const v = await pool.query("SELECT * FROM vehicles WHERE registration_number = 'KA34Z6731' LIMIT 5");
    console.log('Vehicle:', v.rows);
    if (v.rows[0]) {
      const c = await pool.query("SELECT * FROM customers WHERE customer_id = $1", [v.rows[0].customer_id]);
      console.log('Customer:', c.rows);
      const pts = await pool.query("SELECT SUM(points) as total_points FROM points_ledger WHERE customer_id = $1", [v.rows[0].customer_id]);
      console.log('Customer total points:', pts.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
