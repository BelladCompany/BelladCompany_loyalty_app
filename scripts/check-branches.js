const { pool } = require('../src/config/db');
async function checkBranches() {
  const res = await pool.query(`SELECT branch_id, branch_name, tenant_id FROM branches;`);
  console.log(res.rows);
  await pool.end();
}
checkBranches();
