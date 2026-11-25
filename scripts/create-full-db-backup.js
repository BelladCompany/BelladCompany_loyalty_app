const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function backupAll() {
  console.log('📦 Starting Comprehensive Database Backup...');
  const client = await pool.connect();
  try {
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables to backup.`);
    
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `full_db_backup_${timestamp}.json`);
    const data = {
      timestamp: new Date().toISOString(),
      tableCount: tables.length,
      tables: {}
    };

    let totalRows = 0;
    for (const t of tables) {
      const res = await client.query(`SELECT * FROM "${t}"`);
      data.tables[t] = res.rows;
      totalRows += res.rows.length;
      console.log(`  ✓ Table '${t}': ${res.rows.length} rows`);
    }

    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');
    const sizeMb = (fs.statSync(backupFile).size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Backup successfully created at: ${backupFile}`);
    console.log(`   Total Tables: ${tables.length} | Total Rows: ${totalRows} | Size: ${sizeMb} MB\n`);
    return backupFile;
  } catch (err) {
    console.error('❌ Backup failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

backupAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
