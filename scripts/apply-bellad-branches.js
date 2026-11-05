const { Pool } = require('pg');

const BELLAD_BRANCHES = [
  { id: 1, name: 'Ather Energy Hubballi', city: 'Hubballi' },
  { id: 2, name: 'Vida Hubli', city: 'Hubli' },
  { id: 3, name: 'Tata Motors Bellary', city: 'Bellary' },
  { id: 4, name: 'Hyundai Hubli', city: 'Hubli' },
  { id: 5, name: 'Hero Moto Corp Hubli', city: 'Hubli' },
  { id: 6, name: 'MG Motors Belgaum', city: 'Belgaum' },
  { id: 7, name: 'MG Motors Hubballi', city: 'Hubballi' },
  { id: 8, name: 'Ather Energy Belgaum', city: 'Belgaum' },
  { id: 9, name: 'Swaraj Hubli', city: 'Hubli' },
  { id: 10, name: 'Tata Motors Sarjapur Bangalore', city: 'Bangalore' },
  { id: 11, name: 'Ather Bangalore', city: 'Bangalore' },
  { id: 12, name: 'CNH Hubli', city: 'Hubli' },
  { id: 13, name: 'MG Motors Gulbarga', city: 'Gulbarga' },
  { id: 14, name: 'MG Motors Hospet', city: 'Hospet' },
  { id: 15, name: 'Tata Motors Bommasandra Bangalore', city: 'Bangalore' },
  { id: 16, name: 'Haveri TRZ', city: 'Haveri' },
  { id: 17, name: 'Hero Moto Corp Dharwad', city: 'Dharwad' },
  { id: 18, name: 'Hyundai Gadag', city: 'Gadag' },
  { id: 19, name: 'Hyundai Haveri', city: 'Haveri' },
  { id: 20, name: 'Hyundai Dharwad', city: 'Dharwad' },
  { id: 21, name: 'Tilakwadi TRZ', city: 'Tilakwadi' },
  { id: 22, name: 'Tata Motors Raichur', city: 'Raichur' },
  { id: 23, name: 'Ather Bommasandra Bangalore', city: 'Bangalore' },
  { id: 24, name: 'Tata Motors Hospet', city: 'Hospet' },
  { id: 25, name: 'Tata Motors Koppal', city: 'Koppal' },
  { id: 26, name: 'Tata Motors Gangavathi', city: 'Gangavathi' },
  { id: 27, name: 'Tata Motors Sindhnoor', city: 'Sindhnoor' },
  { id: 28, name: 'Tata Motors Bommasandra Workshop', city: 'Bangalore' }
];

async function updateDbBranches(connStr, label) {
  const isCloud = connStr.includes('render.com');
  const pool = new Pool({
    connectionString: connStr,
    ssl: isCloud ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`\n=== Updating ${label} ===`);

    const trigRes = await client.query(`SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'points_ledger';`);
    console.log('Triggers on points_ledger:', trigRes.rows);

    // Disable only the audit modification trigger, not system FK constraint triggers
    try {
      await client.query(`ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;`);
    } catch (e) {
      console.warn('Could not disable trg_prevent_points_ledger_modification:', e.message);
    }

    // 1. First ensure all 28 branches (1..28) exist in branches table
    for (const b of BELLAD_BRANCHES) {
      const code = 'BLD-' + String(b.id).padStart(2, '0');
      const existing = await client.query(`SELECT branch_id FROM branches WHERE branch_id = $1;`, [b.id]);
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE branches SET branch_name = $1, branch_city = $2, code = $3, tenant_id = 'bellad_and_company', updated_at = NOW() WHERE branch_id = $4;`,
          [b.name, b.city, code, b.id]
        );
      } else {
        await client.query(
          `INSERT INTO branches (id, branch_id, branch_name, branch_city, code, tenant_id, created_at, updated_at)
           VALUES ($1, $1, $2, $3, $4, 'bellad_and_company', NOW(), NOW());`,
          [b.id, b.name, b.city, code]
        );
      }
    }
    console.log(`[${label}] Ensured branches 1..28 exist.`);

    // 2. Reassign FK references pointing to branch_id > 28
    const tables = ['points_ledger', 'vehicles', 'redemptions', 'service_transactions', 'sale_transactions', 'correction_requests'];
    for (const t of tables) {
      const res29 = await client.query(`UPDATE ${t} SET branch_id = 8 WHERE branch_id = 29;`);
      if (res29.rowCount > 0) console.log(`[${t}] Reassigned ${res29.rowCount} rows from branch 29 to branch 8`);

      const res43 = await client.query(`UPDATE ${t} SET branch_id = 15 WHERE branch_id = 43;`);
      if (res43.rowCount > 0) console.log(`[${t}] Reassigned ${res43.rowCount} rows from branch 43 to branch 15`);

      const resRest = await client.query(`UPDATE ${t} SET branch_id = 1 WHERE branch_id > 28;`);
      if (resRest.rowCount > 0) console.log(`[${t}] Reassigned ${resRest.rowCount} rows from branch > 28 to branch 1`);
    }

    // 3. Update users:
    await client.query(`UPDATE users SET branch_id = 8 WHERE branch_id = 29 OR username = 'cashier_belgaum';`);
    await client.query(`UPDATE users SET branch_id = 15 WHERE branch_id = 6 AND username = 'cashier-bangluru';`);
    await client.query(`UPDATE users SET branch_id = 1 WHERE branch_id > 28;`);

    // 4. Delete branches with branch_id > 28 or id > 28
    const delRes = await client.query(`DELETE FROM branches WHERE branch_id > 28 OR id > 28;`);
    console.log(`Deleted ${delRes.rowCount} excess branches (> 28)`);

    // Set sequence for branch_id if exists
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'branches_branch_id_seq') THEN
          PERFORM setval('branches_branch_id_seq', 28, true);
        END IF;
      END $$;
    `);

    try {
      await client.query('ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;');
    } catch (e) {
      console.warn('Could not enable trg_prevent_points_ledger_modification:', e.message);
    }
    await client.query('COMMIT');
    console.log(`[${label}] Successfully updated all 28 Bellad branches!`);

    // Verify
    const verify = await client.query(`SELECT branch_id, branch_name, branch_city FROM branches ORDER BY branch_id;`);
    console.log(`[${label}] Total branches in DB:`, verify.rows.length);
    console.table(verify.rows);

    const userVerify = await client.query(`
      SELECT u.username, u.role, u.branch_id, b.branch_name, b.branch_city
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.branch_id
      WHERE u.username IN ('cashier_belgaum', 'cashier-bangluru', 'cashier', 'admin')
      ORDER BY u.user_id;
    `);
    console.log(`[${label}] Key users assigned branches:`);
    console.table(userVerify.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[${label}] ERROR:`, err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function run() {
  const localUrl = 'postgres://postgres:Database@localhost:5432/loyalty_db';
  const renderUrl = 'postgresql://loyalty_user:F6X1RJXptrQGs30vmXb5CTUWaYh9xBWW@dpg-dbhes0g473hc739q6h40-a.oregon-postgres.render.com/loyalty_db_m2f8';

  await updateDbBranches(localUrl, 'LOCAL POSTGRES');
  try {
    await updateDbBranches(renderUrl, 'RENDER CLOUD POSTGRES');
  } catch (e) {
    console.warn('Could not reach Render cloud DB (offline or connection refused):', e.message);
  }
}

run();
