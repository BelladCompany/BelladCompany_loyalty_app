const { pool } = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function createKavyaUser() {
  try {
    const username = 'kavya';
    const password = 'kav@2026';
    const hash = await bcrypt.hash(password, 10);
    const tenant_id = 'bellad_and_company';
    const role = 'cashier'; // initial role: cashier (can be switched via 1-click in Editor)
    const branch_id = 1;

    // Check if user already exists
    const existing = await pool.query('SELECT id, username, role FROM users WHERE LOWER(username) = $1', [username.toLowerCase()]);
    if (existing.rows.length > 0) {
      // Update password and ensure active
      const updated = await pool.query(
        `UPDATE users 
         SET password_hash = $1, role = $2, branch_id = $3
         WHERE id = $4
         RETURNING id, username, role, branch_id`,
        [hash, role, branch_id, existing.rows[0].id]
      );
      console.log('✅ User updated successfully:', updated.rows[0]);
    } else {
      const inserted = await pool.query(
        `INSERT INTO users (tenant_id, username, password_hash, role, branch_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, role, branch_id`,
        [tenant_id, username, hash, role, branch_id]
      );
      console.log('✅ User created successfully:', inserted.rows[0]);
    }

    // Verify authentication test
    const userRow = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [username.toLowerCase()]);
    const isMatch = await bcrypt.compare(password, userRow.rows[0].password_hash);
    console.log(`🔐 Password verification for '${username}':`, isMatch ? 'PASSED' : 'FAILED');

    await pool.end();
  } catch (err) {
    console.error('Error creating user kavya:', err);
    process.exit(1);
  }
}

createKavyaUser();
