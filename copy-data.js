const { Client } = require('pg');
const mk = (u) => {
    const h = new URL(u).hostname;
    const l = ['localhost', '127.0.0.1', '::1'].includes(h);
    const c = new Client({
        connectionString: u, ssl: l ? false : { rejectUnauthorized: false },
        keepAlive: true, query_timeout: 120000, connectionTimeoutMillis: 20000
    });
    c.on('error', (e) => console.log('CONNECTION ERROR:', e.message));
    return c;
};
process.on('unhandledRejection', (e) => { console.log('UNHANDLED:', e && e.message); process.exit(1); });
process.on('exit', (code) => console.log('Script ended, exit code', code));

const SKIP = new Set((process.env.EXCLUDE || '').split(',').filter(Boolean)
    .concat(['schema_migrations', 'migrations', '_migrations']));

(async () => {
    const a = mk(process.env.LOCAL_DB_URL), b = mk(process.env.RENDER_DB_URL);
    await a.connect(); await b.connect();
    console.log('Connected to both databases');

    const tabs = (await a.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`)).rows.map(r => r.table_name);
    const fks = (await a.query(`SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent FROM pg_constraint c WHERE c.contype='f'`)).rows;
    const deps = Object.fromEntries(tabs.map(t => [t, new Set()]));
    for (const f of fks) { const c = f.child.replace(/"/g, ''), p = f.parent.replace(/"/g, ''); if (c !== p && deps[c]) deps[c].add(p); }
    const order = [], done = new Set();
    const visit = (t, st = new Set()) => { if (done.has(t) || st.has(t)) return; st.add(t); for (const p of deps[t] || []) visit(p, st); done.add(t); order.push(t); };
    tabs.forEach(t => visit(t));

    for (const t of order) {
        if (SKIP.has(t)) { console.log(`${t}: excluded`); continue; }
        const rows = (await a.query(`SELECT * FROM "${t}"`)).rows;
        if (!rows.length) { console.log(`${t}: 0 rows, skipped`); continue; }
        if (process.env.APPLY !== '1') { console.log(`${t}: would copy ${rows.length} rows`); continue; }

        console.log(`${t}: copying ${rows.length} rows...`);
        const types = Object.fromEntries((await b.query(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [t])).rows.map(r => [r.column_name, r.data_type]));
        const cols = Object.keys(rows[0]).filter(c => types[c]);
        const conv = (row) => cols.map(c => (row[c] !== null && typeof row[c] === 'object' && /json/.test(types[c])) ? JSON.stringify(row[c]) : row[c]);
        const insert = (chunk) => {
            const params = [];
            const ph = chunk.map(row => { const v = conv(row); const s = params.length; params.push(...v); return `(${v.map((_, j) => `$${s + j + 1}`).join(',')})`; });
            return b.query(`INSERT INTO "${t}" (${cols.map(c => `"${c}"`).join(',')}) VALUES ${ph.join(',')} ON CONFLICT DO NOTHING`, params);
        };
        const size = Math.max(1, Math.min(200, Math.floor(60000 / cols.length)));
        let ok = 0, fail = 0;
        for (let i = 0; i < rows.length; i += size) {
            const chunk = rows.slice(i, i + size);
            try { await insert(chunk); ok += chunk.length; }
            catch (e) {
                for (const row of chunk) {
                    try { await insert([row]); ok++; } catch (e2) { fail++; if (fail <= 2) console.log(`  ${t} error: ${e2.message}`); }
                }
            }
        }
        console.log(`${t}: done, copied ${ok}, failed ${fail}`);
    }

    if (process.env.APPLY === '1') {
        const seqs = (await b.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_default LIKE 'nextval%'`)).rows;
        for (const s of seqs) {
            try { await b.query(`SELECT setval(pg_get_serial_sequence('"${s.table_name}"','${s.column_name}'), COALESCE((SELECT MAX("${s.column_name}") FROM "${s.table_name}"),1))`); } catch { }
        }
        console.log('Sequences reset.');
    } else console.log('\nDry run. Set $env:APPLY="1" to copy.');
    await a.end(); await b.end();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });