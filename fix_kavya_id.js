const { pool } = require('./src/config/db');

async function fix() {
  const res = await pool.query("UPDATE users SET id = user_id WHERE username = 'kavya' RETURNING user_id, id, username, role");
  console.log('Updated user kavya:', res.rows[0]);
  await pool.end();
}
fix();
