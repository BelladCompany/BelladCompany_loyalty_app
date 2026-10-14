const { Client } = require('pg');
const mk = (u) => {
    const h = new URL(u).hostname; const l = ['localhost', '127.0.0.1', '::1'].includes(h);
    return new Client({ connectionString: u, ssl: l ? false : { rejectUnauthorized: false } });
};
(async () => {
    const a = mk(process.env.LOCAL_DB_URL), b = mk(process.env.RENDER_DB_URL);
    await a.connect(); await b.connect();
    const t = await a.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`);
    const out = [];
    for (const { table_name: n } of t.rows) {
        const l = (await a.query(`SELECT count(*)::int c FROM "${n}"`)).rows[0].c;
        let r = 'missing';
        try { r = (await b.query(`SELECT count(*)::int c FROM "${n}"`)).rows[0].c; } catch { }
        out.push({ table: n, local: l, render: r });
    }
    console.table(out);
    await a.end(); await b.end();
})();