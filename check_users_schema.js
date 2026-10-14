const { pool } = require('./src/config/db');

async function checkUsersSchema() {
  const colRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
  console.log('Columns:', colRes.rows);
  const userRes = await pool.query("SELECT * FROM users WHERE username = 'kavya'");
  console.log('Kavya row:', userRes.rows);
  await pool.end();
}

checkUsersSchema();
