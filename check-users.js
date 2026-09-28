const { Client } = require('pg');
const c = new Client({ connectionString: process.env.RENDER_DB_URL, ssl: { rejectUnauthorized: false } });
(async () => {
    await c.connect();
    console.table((await c.query(
        `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_name='users' ORDER BY ordinal_position`)).rows);
    console.table((await c.query(`SELECT count(*) AS users FROM users`)).rows);
    await c.end();
})();