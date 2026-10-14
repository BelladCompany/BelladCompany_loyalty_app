require('dotenv').config();
const { pool } = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function setAdminUser() {
  try {
    const username = 'admin';
    const password = 'admin@123';
    const hash = await bcrypt.hash(password, 10);
    const role = 'admin';

    // Update admin user
    const updated = await pool.query(
      `UPDATE users 
       SET password_hash = $1, role = $2, branch_id = 1, user_id = id
       WHERE LOWER(username) = $3
       RETURNING id, user_id, username, role, branch_id`,
      [hash, role, username]
    );

    console.log('✅ Updated admin user:');
    console.table(updated.rows);

    // Verify authentication test
    const userRow = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [username]);
    const passMatchesLower = await bcrypt.compare('admin@123', userRow.rows[0].password_hash);
    console.log(`Password 'admin@123' verification: ${passMatchesLower ? 'PASSED' : 'FAILED'}`);

    const allUsers = await pool.query('SELECT id, user_id, username, role, branch_id FROM users ORDER BY id');
    console.log('\nAll users in database:');
    console.table(allUsers.rows);

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

setAdminUser();
