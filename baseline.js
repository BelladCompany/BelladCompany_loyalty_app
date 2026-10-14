const { Client } = require('pg');

function mk(url) {
    const h = new URL(url).hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(h);
    return new Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
}

(async () => {
    const local = mk(process.env.LOCAL_DB_URL);
    const remote = mk(process.env.RENDER_DB_URL);
    await local.connect();
    await remote.connect();

    const t = await local.query(
        `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name ILIKE '%migrat%'`);
    if (!t.rows.length) { console.log('No migrations table found locally. Send me src/db/migrate.js'); process.exit(1); }

    for (const { table_name } of t.rows) {
        const rows = (await local.query(`SELECT * FROM "${table_name}"`)).rows;
        console.log(`\nLocal table "${table_name}" has ${rows.length} rows:`);
        console.table(rows);
        if (!rows.length) { console.log('Empty locally. Send me src/db/migrate.js'); continue; }

        const exists = await remote.query(
            `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [table_name]);
        if (!exists.rows.length) { console.log(`Table ${table_name} missing on Render. Send me src/db/migrate.js`); continue; }

        if (process.env.APPLY !== '1') { console.log('Dry run. Set APPLY=1 to copy these rows to Render.'); continue; }

        for (const row of rows) {
            const cols = Object.keys(row);
            const vals = cols.map((_, i) => `$${i + 1}`).join(',');
            await remote.query(
                `INSERT INTO "${table_name}" (${cols.map(c => `"${c}"`).join(',')})
         VALUES (${vals}) ON CONFLICT DO NOTHING`,
                cols.map(c => row[c]));
        }
        console.log(`Copied ${rows.length} rows to Render.`);
        console.table((await remote.query(`SELECT * FROM "${table_name}"`)).rows);
    }
    await local.end();
    await remote.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });