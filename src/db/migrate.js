const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigrations(options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  console.log(`🔄 Running database migrations ${isDryRun ? '[DRY RUN MODE]' : ''}...`);

  let client;
  let retries = 5;
  while (retries > 0) {
    try {
      client = await pool.connect();
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('❌ Failed to connect to database for migrations after multiple attempts:', err.message);
        throw err;
      }
      console.log(`⚠️ Database not ready yet (${err.message}). Retrying in 3 seconds... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  try {
    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migration files
    const appliedRes = await client.query('SELECT filename FROM schema_migrations;');
    const appliedFiles = new Set(appliedRes.rows.map((r) => r.filename));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let newCount = 0;
    for (const file of files) {
      if (appliedFiles.has(file)) {
        continue;
      }

      console.log(`- ${isDryRun ? '[DRY RUN] Would execute' : 'Executing'} migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      if (isDryRun) {
        // Validate SQL syntax inside a transaction that is ALWAYS rolled back
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('ROLLBACK');
        console.log(`  ✓ Syntax check passed for: ${file}`);
      } else {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1);', [file]);
        await client.query('COMMIT');
      }
      newCount++;
    }

    if (newCount === 0) {
      console.log('✅ Database schema is up to date (no new migrations needed).');
    } else {
      console.log(`✅ ${newCount} migration(s) ${isDryRun ? 'validated in dry-run mode' : 'applied successfully'}!`);
    }
  } catch (error) {
    if (!isDryRun) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
