const { Client } = require('pg');

function makeClient(url) {
    const host = new URL(url).hostname;
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
    return new Client({
        connectionString: url,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
    });
}

async function tryConnect(name, client) {
    try {
        await client.connect();
        console.log(`✔ ${name} connected`);
        return true;
    } catch (e) {
        console.log(`✘ ${name} FAILED: ${e.message}`);
        return false;
    }
}

const COLS = `SELECT table_name, column_name, data_type, character_maximum_length
              FROM information_schema.columns
              WHERE table_schema='public'
              ORDER BY table_name, ordinal_position`;

(async () => {
    const local = makeClient(process.env.LOCAL_DB_URL);
    const remote = makeClient(process.env.RENDER_DB_URL);

    const okLocal = await tryConnect('LOCAL', local);
    const okRemote = await tryConnect('RENDER', remote);
    if (!okLocal || !okRemote) process.exit(1);

    const l = (await local.query(COLS)).rows;
    const r = (await remote.query(COLS)).rows;
    const haveCols = new Set(r.map(x => `${x.table_name}.${x.column_name}`));
    const haveTables = new Set(r.map(x => x.table_name));

    for (const c of l) {
        if (haveCols.has(`${c.table_name}.${c.column_name}`)) continue;
        if (!haveTables.has(c.table_name)) {
            console.log(`TABLE MISSING on Render: ${c.table_name} (run your schema.sql)`);
            continue;
        }
        if (c.data_type === 'USER-DEFINED' || c.data_type === 'ARRAY') {
            console.log(`SKIPPED (add manually): ${c.table_name}.${c.column_name}`);
            continue;
        }
        const type = c.data_type === 'character varying'
            ? `varchar(${c.character_maximum_length || 255})` : c.data_type;
        const sql = `ALTER TABLE "${c.table_name}" ADD COLUMN IF NOT EXISTS "${c.column_name}" ${type}`;
        console.log(sql);
        if (process.env.APPLY === '1') await remote.query(sql);
    }

    console.log(process.env.APPLY === '1' ? 'Applied.' : 'Dry run only. Set APPLY=1 to apply.');
    await local.end();
    await remote.end();
})();