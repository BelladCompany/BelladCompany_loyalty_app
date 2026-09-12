// scripts/fix-neeta-nagarathnamma-split.js
const { pool } = require('../src/config/db');

async function splitCustomers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- Fixing Nagarathnamma and Neeta split ---');

    // 1. Create distinct customer profile for Nagarathnamma
    const nagarathnammaId = 'BAC-NAGARATHNAMMA';

    // Delete existing test record for Nagarathnamma if re-running
    await client.query(`DELETE FROM vehicles WHERE customer_id = $1;`, [nagarathnammaId]);
    await client.query(`DELETE FROM customer_phones WHERE customer_id = $1;`, [nagarathnammaId]);
    await client.query(`DELETE FROM customers WHERE customer_id = $1;`, [nagarathnammaId]);

    await client.query(
      `INSERT INTO customers (
         customer_id, customer_name, tenant_id, branch_name, firm_name
       )
       VALUES ($1, 'Nagarathnamma', 'bellad_and_company', 'ATHER BOMMASANDRA BANGALORE', 'Bellad Enterprises Pvt Ltd');`,
      [nagarathnammaId]
    );

    // 2. Re-assign vehicle MYHABFCB7TBF06740 (vehicle_id 6374) to Nagarathnamma
    await client.query(
      `UPDATE vehicles
       SET customer_id = $1
       WHERE chassis_no = 'MYHABFCB7TBF06740' OR vin = 'MYHABFCB7TBF06740';`,
      [nagarathnammaId]
    );

    // 3. Re-assign phone 7483978157 (phone_id 11224) to Nagarathnamma
    await client.query(
      `UPDATE customer_phones
       SET customer_id = $1
       WHERE phone_number = '7483978157';`,
      [nagarathnammaId]
    );

    // 4. Update ledger entries for MYHABFCB7TBF06740 if any
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification') THEN
          ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;
        END IF;
      END $$;
    `);

    await client.query(
      `UPDATE points_ledger
       SET customer_id = $1
       WHERE vehicle_id IN (SELECT vehicle_id FROM vehicles WHERE chassis_no = 'MYHABFCB7TBF06740');`,
      [nagarathnammaId]
    );

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification') THEN
          ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('✅ Successfully separated Nagarathnamma and Neeta Sanjay Deore into distinct customer profiles!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to split customers:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

splitCustomers();
