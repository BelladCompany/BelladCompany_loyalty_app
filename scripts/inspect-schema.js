const { Client } = require('pg');
const c = new Client({ connectionString: 'postgres://postgres:Database@localhost:5432/loyalty_db' });
c.connect().then(async () => {
  const r = await c.query(
    `SELECT tc.table_name, tc.constraint_name, kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
     WHERE tc.table_name IN ('customer_tier_snapshot','points_ledger','point_rules','tier_rules')
       AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE')
     ORDER BY tc.table_name;`
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
}).catch((e) => { console.error(e.message); process.exit(1); });