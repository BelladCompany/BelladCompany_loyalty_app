const { pool } = require('../src/config/db');
async function checkPR() {
  const res = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'point_rules';`
  );
  console.log(res.rows);
  await pool.end();
}
checkPR();
