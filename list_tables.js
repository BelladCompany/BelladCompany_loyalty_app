require('dotenv').config();
const { pool } = require('./src/config/db');

async function testTables() {
  const t = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log(t.rows.map(r => r.table_name));
  await pool.end();
}
testTables();
