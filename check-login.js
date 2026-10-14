const { Client } = require('pg');
const c = new Client({ connectionString: process.env.RENDER_DB_URL, ssl: { rejectUnauthorized: false } });
(async () => {
    await c.connect();
    const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`);
    console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));
    const u = await c.query(`SELECT * FROM users`);
    console.log('Users on Render:', u.rows.length);
    console.table(u.rows.map(r => ({
        ...r,
        password_hash: r.password_hash ? r.password_hash.slice(0, 7) + '...' : null,
    })));
    await c.end();
})();
