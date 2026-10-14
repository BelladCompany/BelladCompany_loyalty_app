const { pool } = require('./src/config/db');

async function fixAllNullIds() {
  const res = await pool.query("UPDATE users SET id = user_id WHERE id IS NULL RETURNING user_id, id, username");
  console.log('Fixed users with null id:', res.rows);
  await pool.end();
}
fixAllNullIds();
