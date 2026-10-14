const { Client } = require('pg');
const c = new Client({ connectionString: process.env.RENDER_DB_URL, ssl: { rejectUnauthorized: false } });
(async () => {
    await c.connect();
    console.log('DB host:', new URL(process.env.RENDER_DB_URL).hostname);
    const t = await c.query(`SELECT table_name FROM information_schema.tables
                           WHERE table_schema='public' AND table_name ILIKE '%migrat%'`);
    console.log('Tracking tables found:', t.rows.map(r => r.table_name));
    for (const r of t.rows) {
        const rows = (await c.query(`SELECT * FROM "${r.table_name}"`)).rows;
        console.log(r.table_name, 'has', rows.length, 'rows');
        console.table(rows);
    }
    await c.end();
})();