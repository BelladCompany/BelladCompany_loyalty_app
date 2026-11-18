const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/db');

async function exportAllData() {
  console.log('Fetching all tables...');
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = res.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables.`);

  const backupData = {
    metadata: {
      exported_at: new Date().toISOString(),
      database: 'loyalty_platform_db',
      table_count: tables.length,
      tables: {}
    },
    data: {}
  };

  let totalRows = 0;
  for (const table of tables) {
    try {
      const dataRes = await pool.query(`SELECT * FROM "${table}"`);
      backupData.data[table] = dataRes.rows;
      backupData.metadata.tables[table] = dataRes.rows.length;
      totalRows += dataRes.rows.length;
      console.log(`  - ${table}: ${dataRes.rows.length} rows`);
    } catch (err) {
      console.error(`  x Error reading table ${table}:`, err.message);
      backupData.data[table] = [];
      backupData.metadata.tables[table] = { error: err.message };
    }
  }

  backupData.metadata.total_rows = totalRows;

  const outputPath = path.join(__dirname, 'backups', 'loyalty_platform_db_full_dump_2026-11-16.json');
  console.log(`Writing to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`Successfully exported ${tables.length} tables and ${totalRows} total rows to ${outputPath}`);

  await pool.end();
}

exportAllData().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
