const fs = require('fs');
const { Client } = require('pg');

const url = process.env.RENDER_DB_URL;
const files = process.argv.slice(2);
if (!files.length) { console.log('Usage: node reset-render.js schema.sql seed.sql'); process.exit(1); }

for (const f of files) {
    if (!fs.existsSync(f)) { console.log('File not found:', f, '- nothing was changed.'); process.exit(1); }
}

console.log('TARGET HOST:', new URL(url).hostname);
if (process.env.CONFIRM !== 'YES') {
    console.log('This DROPS ALL TABLES on that host. Set $env:CONFIRM="YES" to continue.');
    process.exit(1);
}

// remove psql-only meta-commands (lines starting with a backslash)
const clean = (f) =>
    fs.readFileSync(f, 'utf8')
        .split(/\r?\n/)
        .filter((line) => !line.startsWith('\\'))
        .join('\n');

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
(async () => {
    await c.connect();
    await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    for (const f of files) {
        console.log('Running', f);
        await c.query(clean(f));
    }
    console.log('Done.');
    await c.end();
})().catch((e) => {
    console.error('FAILED:', e.message);
    if (e.position) console.error('Near character position', e.position, 'in the last file');
    process.exit(1);
});