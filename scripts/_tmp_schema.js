const { Client } = require('pg');
const c = new Client({ connectionString: 'postgres://postgres:Database@localhost:5432/loyalty_db' });
c.connect().then(async () => {
  const r = await c.query(
    `SELECT table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN ('referrals','referral_approvers','redemptions','otp_requests','customers','users','customer_phones','notifications')
     ORDER BY table_name, ordinal_position;`
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
}).catch((e) => { console.error(e.message); process.exit(1); });