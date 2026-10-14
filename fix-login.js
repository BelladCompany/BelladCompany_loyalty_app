const { Client } = require('pg');
const bcrypt = (() => { try { return require('bcryptjs'); } catch { return require('bcrypt'); } })();

const c = new Client({ connectionString: process.env.RENDER_DB_URL, ssl: { rejectUnauthorized: false } });
const demo = [['admin', 'Admin@123'], ['cashier', 'Cashier@123']];

(async () => {
    await c.connect();
    for (const [username, pw] of demo) {
        const r = await c.query(`SELECT password_hash FROM users WHERE username=$1`, [username]);
        if (!r.rows.length) { console.log(`${username}: NOT FOUND`); continue; }
        const ok = await bcrypt.compare(pw, r.rows[0].password_hash);
        console.log(`${username}: stored hash ${ok ? 'MATCHES' : 'does NOT match'} "${pw}"`);
        if (!ok && process.env.APPLY === '1') {
            const hash = await bcrypt.hash(pw, 10);
            await c.query(`UPDATE users SET password_hash=$1, updated_at=now() WHERE username=$2`, [hash, username]);
            console.log(`  -> password reset for ${username}`);
        }
    }
    if (process.env.APPLY !== '1') console.log('\nCheck only. Set $env:APPLY="1" to reset any that do not match.');
    await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });