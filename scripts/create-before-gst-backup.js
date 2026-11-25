const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pool } = require('../src/config/db');

async function run() {
  console.log('🚀 Starting Full Backup: Database + Application...');
  const rootDir = path.resolve(__dirname, '..');
  const tempDir = path.join(rootDir, 'temp_backup_staging');
  const backupFolder = path.join(tempDir, 'before_gst_backup');
  const dbFolder = path.join(backupFolder, 'database');
  const appFolder = path.join(backupFolder, 'app');

  // Clean previous temp directory if any
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(dbFolder, { recursive: true });
  fs.mkdirSync(appFolder, { recursive: true });

  // 1. Fetch DB table list and row counts
  console.log('📊 Fetching database metadata...');
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
    ORDER BY table_name;
  `);

  const tableSummary = {
    backup_name: 'before gst backup',
    created_at: new Date().toISOString(),
    commit_hash: '448b9bd822fcb91cbe813505a988b88edc1ce222',
    database_name: 'loyalty_platform_db',
    total_tables: tablesRes.rows.length,
    tables: {}
  };

  let totalRows = 0;
  for (const r of tablesRes.rows) {
    try {
      const cRes = await pool.query(`SELECT COUNT(*) FROM "${r.table_name}";`);
      const count = parseInt(cRes.rows[0].count, 10);
      tableSummary.tables[r.table_name] = count;
      totalRows += count;
    } catch (e) {
      tableSummary.tables[r.table_name] = `Error: ${e.message}`;
    }
  }
  tableSummary.total_rows = totalRows;

  fs.writeFileSync(
    path.join(dbFolder, 'table_summary.json'),
    JSON.stringify(tableSummary, null, 2),
    'utf8'
  );
  console.log(`✓ Table summary written: ${tableSummary.total_tables} tables, ${totalRows} total rows.`);

  // 2. Dump PostgreSQL Database (both .sql and .dump)
  console.log('📦 Dumping PostgreSQL database using pg_dump...');
  const pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
  const sqlDumpFile = path.join(dbFolder, 'loyalty_platform_db.sql');
  const customDumpFile = path.join(dbFolder, 'loyalty_platform_db.dump');

  process.env.PGPASSWORD = process.env.DB_PASSWORD || 'Database';
  
  // Plain text SQL dump
  console.log('  -> Generating plain text SQL dump (loyalty_platform_db.sql)...');
  execSync(
    `"${pgDumpPath}" -h localhost -p 5432 -U postgres -d loyalty_platform_db -f "${sqlDumpFile}"`,
    { stdio: 'inherit', env: process.env }
  );

  // Custom format dump for fast pg_restore
  console.log('  -> Generating compressed binary dump (loyalty_platform_db.dump)...');
  execSync(
    `"${pgDumpPath}" -h localhost -p 5432 -U postgres -Fc -d loyalty_platform_db -f "${customDumpFile}"`,
    { stdio: 'inherit', env: process.env }
  );

  const sqlSizeMb = (fs.statSync(sqlDumpFile).size / (1024 * 1024)).toFixed(2);
  const dumpSizeMb = (fs.statSync(customDumpFile).size / (1024 * 1024)).toFixed(2);
  console.log(`✓ SQL dump size: ${sqlSizeMb} MB, Custom dump size: ${dumpSizeMb} MB`);

  // 3. Write Database Restore Instructions
  const restoreGuide = `# PostgreSQL Database Restore Guide
## Backup: Before GST Backup
- **Database**: \`loyalty_platform_db\`
- **Tables**: ${tableSummary.total_tables}
- **Total Records**: ${totalRows.toLocaleString()}
- **Date**: ${new Date().toLocaleString()}

### Option A: Restore using psql (Plain SQL)
\`\`\`bash
# 1. Create fresh database (if needed)
createdb -U postgres loyalty_platform_db

# 2. Restore all tables, triggers, sequences, and data
psql -U postgres -d loyalty_platform_db -f loyalty_platform_db.sql
\`\`\`

### Option B: Restore using pg_restore (Fast Parallel)
\`\`\`bash
# Restore with schema creation and clean
pg_restore -U postgres -d loyalty_platform_db --clean --if-exists loyalty_platform_db.dump
\`\`\`
`;
  fs.writeFileSync(path.join(dbFolder, 'README_RESTORE.md'), restoreGuide, 'utf8');

  // 4. Copy Application Source Code
  console.log('📁 Copying application source code...');
  const appIncludes = [
    'src',
    'scripts',
    'docs',
    'package.json',
    'package-lock.json',
    '.env',
    '.env.example',
    '.gitignore',
    'README.md',
    'update_models_sidebar.py'
  ];

  for (const item of appIncludes) {
    const srcPath = path.join(rootDir, item);
    const destPath = path.join(appFolder, item);
    if (fs.existsSync(srcPath)) {
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Copy client directory excluding client/node_modules and client/dist
  console.log('  -> Copying frontend client (excluding node_modules/dist)...');
  const clientSrc = path.join(rootDir, 'client');
  const clientDest = path.join(appFolder, 'client');
  fs.cpSync(clientSrc, clientDest, {
    recursive: true,
    filter: (source) => {
      const rel = path.relative(clientSrc, source);
      if (rel.startsWith('node_modules') || rel.startsWith('dist') || rel.startsWith('.vite')) {
        return false;
      }
      return true;
    }
  });

  // 5. Create Root Backup Manifest
  const manifest = `# BACKUP MANIFEST: BEFORE GST BACKUP
- **Archive Name**: before gst backup.zip
- **Timestamp**: ${new Date().toISOString()} (${new Date().toLocaleString()})
- **Git Commit**: 448b9bd822fcb91cbe813505a988b88edc1ce222
- **App Version**: v2 (Full Suite with Redemptions, Referrals, Gift Cards, Campaigns, POS, Reports)
- **Database Name**: loyalty_platform_db
- **Database Tables Count**: ${tableSummary.total_tables} tables
- **Total Records in Database**: ${totalRows.toLocaleString()} rows

---

### Archive Contents Structure:
\`\`\`
before_gst_backup/
├── BACKUP_MANIFEST.md
├── database/
│   ├── loyalty_platform_db.sql    (Full plain-text SQL dump)
│   ├── loyalty_platform_db.dump   (PostgreSQL custom compressed archive for pg_restore)
│   ├── table_summary.json         (Exact table-by-table record count)
│   └── README_RESTORE.md          (Step-by-step database restore commands)
└── app/
    ├── src/                       (Backend controllers, services, middleware, routes, migrations 001-077)
    ├── client/                    (Vite + React frontend source, components, screens, config)
    ├── scripts/                   (Automation, verification, seeding, and migration scripts)
    ├── docs/                      (Architecture, RealBooks, API and Kubernetes guides)
    ├── package.json
    ├── package-lock.json
    ├── .env
    ├── .env.example
    └── README.md
\`\`\`

---

### Quick Start to Run from Backup:
1. **Restore Database**:
   \`\`\`bash
   psql -U postgres -d loyalty_platform_db -f database/loyalty_platform_db.sql
   \`\`\`
2. **Install Backend & Client**:
   \`\`\`bash
   cd app
   npm install
   cd client && npm install
   \`\`\`
3. **Start Development**:
   \`\`\`bash
   # In app root:
   npm run dev

   # In client root:
   npm run dev
   \`\`\`
`;
  fs.writeFileSync(path.join(backupFolder, 'BACKUP_MANIFEST.md'), manifest, 'utf8');

  // 6. Compress into ZIP using tar -a -c -f
  console.log('🗜️ Creating ZIP file: "before gst backup.zip"...');
  const zipFileWithSpaces = path.join(rootDir, 'before gst backup.zip');
  const zipFileNoSpaces = path.join(rootDir, 'before_gst_backup.zip');

  if (fs.existsSync(zipFileWithSpaces)) fs.unlinkSync(zipFileWithSpaces);
  if (fs.existsSync(zipFileNoSpaces)) fs.unlinkSync(zipFileNoSpaces);

  // Run tar command from within temp_backup_staging
  execSync(
    `tar -a -c -f "${zipFileWithSpaces}" before_gst_backup`,
    { cwd: tempDir, stdio: 'inherit' }
  );

  // Also create a copy without spaces for convenience
  fs.copyFileSync(zipFileWithSpaces, zipFileNoSpaces);

  const zipSizeMb = (fs.statSync(zipFileWithSpaces).size / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 Backup successfully created!`);
  console.log(`   Location: ${zipFileWithSpaces}`);
  console.log(`   Mirror:   ${zipFileNoSpaces}`);
  console.log(`   Zip Size: ${zipSizeMb} MB`);

  // Clean up staging folder
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('🧹 Cleaned up temporary staging directory.');

  await pool.end();
}

run().catch((err) => {
  console.error('❌ Backup generation failed:', err);
  process.exit(1);
});
