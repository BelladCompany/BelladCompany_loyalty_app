const { pool } = require('../src/config/db');

async function listTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE' 
      ORDER BY table_name;
    `);

    console.log('COUNT:', res.rows.length);
    console.log('TABLES:');
    res.rows.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.table_name}`);
    });

    // Also get row count for each table to give rich insights
    console.log('\n--- ROW COUNTS ---');
    for (const r of res.rows) {
      try {
        const cRes = await pool.query(`SELECT COUNT(*) FROM "${r.table_name}";`);
        console.log(`- ${r.table_name}: ${cRes.rows[0].count} rows`);
      } catch (err) {
        console.log(`- ${r.table_name}: error reading rows (${err.message})`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error fetching tables:', err);
    process.exit(1);
  }
}

listTables();
