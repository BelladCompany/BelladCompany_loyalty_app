const { pool } = require('../src/config/db');

async function setup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Inspect vehicles columns
    const vCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicles';");
    const vColList = vCols.rows.map(r => r.column_name);
    console.log('Vehicle columns:', vColList.join(', '));

    // 2. Activate CAMP-0001 with active dates including today
    await client.query(`
      UPDATE campaigns
      SET status = 'ACTIVE',
          start_date = '2026-11-01',
          end_date = '2026-12-31',
          brand = 'Hero',
          all_models = true,
          all_branches = true,
          spend_category = 'sale',
          type = 'PCT_OF_STANDARD',
          value = 25.00
      WHERE code = 'CAMP-0001';
    `);

    const campRes = await client.query("SELECT id, code, name, status, start_date, end_date FROM campaigns WHERE code = 'CAMP-0001';");
    console.log('Updated campaign:', campRes.rows[0]);
    const campId = campRes.rows[0].id;

    // 3. Upsert Dummy Customer
    const custId = 'BAC-DEMO-001';
    await client.query('DELETE FROM points_ledger WHERE customer_id = $1;', [custId]);
    await client.query('DELETE FROM vehicles WHERE customer_id = $1;', [custId]);
    await client.query('DELETE FROM customers WHERE customer_id = $1;', [custId]);

    await client.query(`
      INSERT INTO customers (
        customer_id, customer_name, name, tenant_id, branch_name, aadhaar_number, visit_type, is_first_time_visitor, is_merged
      ) VALUES (
        $1, 'Demo Customer (Manager Review)', 'Demo Customer (Manager Review)', 'bellad_and_company', 'Hubballi Main Showroom', '999988887777', 'first_time', true, false
      );
    `, [custId]);
    console.log(`Customer '${custId}' created.`);

    // 4. Insert Dummy Vehicle
    let vInsCols = ['customer_id', 'tenant_id'];
    let vInsVals = [custId, 'bellad_and_company'];

    if (vColList.includes('model')) { vInsCols.push('model'); vInsVals.push('Splendor Plus'); }
    if (vColList.includes('brand_name')) { vInsCols.push('brand_name'); vInsVals.push('Hero'); }
    if (vColList.includes('vehicle_type')) { vInsCols.push('vehicle_type'); vInsVals.push('2W'); }
    if (vColList.includes('registration_number')) { vInsCols.push('registration_number'); vInsVals.push('KA-25-DEMO-9999'); }
    if (vColList.includes('vin')) { vInsCols.push('vin'); vInsVals.push('MBHHA11TESTDEMO01'); }
    if (vColList.includes('purchase_date')) { vInsCols.push('purchase_date'); vInsVals.push('2026-11-19'); }
    if (vColList.includes('dms_invoice_date')) { vInsCols.push('dms_invoice_date'); vInsVals.push('2026-11-19'); }

    const vPlaceholders = vInsVals.map((_, i) => `$${i + 1}`).join(', ');
    const vRes = await client.query(
      `INSERT INTO vehicles (${vInsCols.join(', ')}) VALUES (${vPlaceholders}) RETURNING vehicle_id;`,
      vInsVals
    );
    const vehicleId = vRes.rows[0]?.vehicle_id || null;
    console.log(`Vehicle created with ID: ${vehicleId}`);

    // 5. Insert Points Ledger: Standard Row
    const invoiceRef = 'INV-DEMO-2026-001';
    const stdRes = await client.query(`
      INSERT INTO points_ledger (
        customer_id, vehicle_id, branch_id, type, transaction_category, points,
        source_ref, tenant_id, source_type, reason_type, reason_text, amount_paise, created_at
      ) VALUES (
        $1, $2, 1, 'earn_sale', 'sale', 800,
        $3, 'bellad_and_company', 'STANDARD', 'purchase',
        'Vehicle Purchase (Hero Splendor Plus - Ex-Showroom ₹80,000)',
        8000000, NOW() - INTERVAL '1 hour'
      ) RETURNING entry_id;
    `, [custId, vehicleId, invoiceRef]);
    const stdEntryId = stdRes.rows[0].entry_id;
    console.log(`Standard points ledger entry: ${stdEntryId} (800 pts)`);

    // 6. Insert Points Ledger: Campaign Bonus Row
    const bonusRes = await client.query(`
      INSERT INTO points_ledger (
        customer_id, vehicle_id, branch_id, type, transaction_category, points,
        source_ref, tenant_id, source_type, campaign_id, parent_entry_id, reason_type, reason_text, amount_paise, created_at
      ) VALUES (
        $1, $2, 1, 'earn_sale', 'sale', 200,
        $3, 'bellad_and_company', 'CAMPAIGN', $4, $5, 'campaign_bonus',
        'festive-offer-critsmas (+200 pts bonus)',
        8000000, NOW()
      ) RETURNING entry_id;
    `, [custId, vehicleId, invoiceRef, campId, stdEntryId]);
    console.log(`Campaign bonus ledger entry: ${bonusRes.rows[0].entry_id} (+200 pts)`);

    // 7. Update Tier (Computed dynamically from points_ledger)
    await client.query('COMMIT');
    console.log('✅ Demo Customer BAC-DEMO-001 setup complete!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Setup failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

setup();
