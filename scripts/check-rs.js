const { pool } = require('../src/config/db');
async function checkRS() {
  const res = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referral_slabs';`
  );
  console.log(res.rows);
  await pool.end();
}
checkRS();
