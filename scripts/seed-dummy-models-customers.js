const { pool } = require('../src/config/db');
const CampaignEngineService = require('../src/services/campaignEngine.service');

const DUMMY_MODELS = [
  {
    id: 'BAC-DUMMY-HERO-SPLENDOR',
    name: 'Dummy - Hero Splendor Plus',
    brand: 'HERO MOTO CORP',
    model: 'SPLENDOR+',
    vehicle_type: '2W',
    price: 80000,
    branch_id: 5,
    branch_name: 'Hero Moto Corp Hubli',
    phone: '9000000001',
    vin: 'MBHHA11DUMMYHERO01',
    reg: 'KA-25-DUMMY-01'
  },
  {
    id: 'BAC-DUMMY-HERO-HFDELUXE',
    name: 'Dummy - Hero HF Deluxe',
    brand: 'HERO MOTO CORP',
    model: 'HF DELUXE',
    vehicle_type: '2W',
    price: 65000,
    branch_id: 5,
    branch_name: 'Hero Moto Corp Hubli',
    phone: '9000000002',
    vin: 'MBHHA11DUMMYHERO02',
    reg: 'KA-25-DUMMY-02'
  },
  {
    id: 'BAC-DUMMY-HERO-PASSION',
    name: 'Dummy - Hero Passion Plus',
    brand: 'HERO MOTO CORP',
    model: 'PASSION+',
    vehicle_type: '2W',
    price: 75000,
    branch_id: 5,
    branch_name: 'Hero Moto Corp Hubli',
    phone: '9000000003',
    vin: 'MBHHA11DUMMYHERO03',
    reg: 'KA-25-DUMMY-03'
  },
  {
    id: 'BAC-DUMMY-TATA-NEXON',
    name: 'Dummy - Tata Nexon',
    brand: 'TATA MOTORS',
    model: 'NEXON',
    vehicle_type: '4W',
    price: 900000,
    branch_id: 3,
    branch_name: 'Tata Motors Bellary',
    phone: '9000000004',
    vin: 'MAT621DUMMYTATA04',
    reg: 'KA-34-DUMMY-04'
  },
  {
    id: 'BAC-DUMMY-TATA-PUNCH',
    name: 'Dummy - Tata Punch',
    brand: 'TATA MOTORS',
    model: 'PUNCH',
    vehicle_type: '4W',
    price: 650000,
    branch_id: 3,
    branch_name: 'Tata Motors Bellary',
    phone: '9000000005',
    vin: 'MAT621DUMMYTATA05',
    reg: 'KA-34-DUMMY-05'
  },
  {
    id: 'BAC-DUMMY-TATA-HARRIER',
    name: 'Dummy - Tata Harrier',
    brand: 'TATA MOTORS',
    model: 'HARRIER',
    vehicle_type: '4W',
    price: 1800000,
    branch_id: 10,
    branch_name: 'Tata Motors Sarjapur Bangalore',
    phone: '9000000006',
    vin: 'MAT621DUMMYTATA06',
    reg: 'KA-01-DUMMY-06'
  },
  {
    id: 'BAC-DUMMY-TATA-TIAGO',
    name: 'Dummy - Tata Tiago',
    brand: 'TATA MOTORS',
    model: 'TIAGO',
    vehicle_type: '4W',
    price: 550000,
    branch_id: 3,
    branch_name: 'Tata Motors Bellary',
    phone: '9000000007',
    vin: 'MAT621DUMMYTATA07',
    reg: 'KA-34-DUMMY-07'
  },
  {
    id: 'BAC-DUMMY-HYUNDAI-CRETA',
    name: 'Dummy - Hyundai Creta',
    brand: 'HYUNDAI',
    model: 'New Creta',
    vehicle_type: '4W',
    price: 1100000,
    branch_id: 4,
    branch_name: 'Hyundai Hubli',
    phone: '9000000008',
    vin: 'MALAA51DUMMYHYU08',
    reg: 'KA-25-DUMMY-08'
  },
  {
    id: 'BAC-DUMMY-HYUNDAI-VENUE',
    name: 'Dummy - Hyundai Venue',
    brand: 'HYUNDAI',
    model: 'Venue',
    vehicle_type: '4W',
    price: 850000,
    branch_id: 4,
    branch_name: 'Hyundai Hubli',
    phone: '9000000009',
    vin: 'MALAA51DUMMYHYU09',
    reg: 'KA-25-DUMMY-09'
  },
  {
    id: 'BAC-DUMMY-HYUNDAI-EXTER',
    name: 'Dummy - Hyundai Exter',
    brand: 'HYUNDAI',
    model: 'EXTER',
    vehicle_type: '4W',
    price: 600000,
    branch_id: 4,
    branch_name: 'Hyundai Hubli',
    phone: '9000000010',
    vin: 'MALAA51DUMMYHYU10',
    reg: 'KA-25-DUMMY-10'
  },
  {
    id: 'BAC-DUMMY-ATHER-450X',
    name: 'Dummy - Ather 450X',
    brand: 'ATHER ENERGY',
    model: 'ATHER 450X HR',
    vehicle_type: '2W',
    price: 150000,
    branch_id: 1,
    branch_name: 'Ather Energy Hubballi',
    phone: '9000000011',
    vin: 'ME4ATHERDUMMY011',
    reg: 'KA-25-DUMMY-11'
  },
  {
    id: 'BAC-DUMMY-ATHER-RIZTA',
    name: 'Dummy - Ather Rizta',
    brand: 'ATHER ENERGY',
    model: 'RIZTA',
    vehicle_type: '2W',
    price: 120000,
    branch_id: 8,
    branch_name: 'Ather Energy Belgaum',
    phone: '9000000012',
    vin: 'ME4ATHERDUMMY012',
    reg: 'KA-22-DUMMY-12'
  },
  {
    id: 'BAC-DUMMY-MG-WINDSOR',
    name: 'Dummy - MG Windsor EV',
    brand: 'MG MOTORS',
    model: 'WINDSOR EV',
    vehicle_type: '4W',
    price: 1400000,
    branch_id: 7,
    branch_name: 'MG Motors Hubballi',
    phone: '9000000013',
    vin: 'MZ7DUMMYMG013',
    reg: 'KA-25-DUMMY-13'
  },
  {
    id: 'BAC-DUMMY-MG-COMET',
    name: 'Dummy - MG Comet EV',
    brand: 'MG MOTORS',
    model: 'MG_COMET_EV',
    vehicle_type: '4W',
    price: 700000,
    branch_id: 6,
    branch_name: 'MG Motors Belgaum',
    phone: '9000000014',
    vin: 'MZ7DUMMYMG014',
    reg: 'KA-22-DUMMY-14'
  },
  {
    id: 'BAC-DUMMY-SWARAJ-742',
    name: 'Dummy - Swaraj 742',
    brand: 'SWARAJ',
    model: '742',
    vehicle_type: '4W',
    price: 680000,
    branch_id: 9,
    branch_name: 'Swaraj Hubli',
    phone: '9000000015',
    vin: 'SWRJDUMMY015',
    reg: 'KA-25-DUMMY-15'
  },
  {
    id: 'BAC-DUMMY-VIDA-V1',
    name: 'Dummy - Vida V1 Pro',
    brand: 'Vida',
    model: 'VIDA V1 PRO',
    vehicle_type: '2W',
    price: 125000,
    branch_id: 2,
    branch_name: 'Vida Hubli',
    phone: '9000000016',
    vin: 'VIDADUMMY016',
    reg: 'KA-25-DUMMY-16'
  },
  {
    id: 'BAC-DEMO-001',
    name: 'Dummy - Demo Customer Splendor',
    brand: 'Hero',
    model: 'Splendor Plus',
    vehicle_type: '2W',
    price: 80000,
    branch_id: 5,
    branch_name: 'Hero Moto Corp Hubli',
    phone: '9999888877',
    vin: 'MBHHA11TESTDEMO01',
    reg: 'KA-25-DEMO-9999'
  }
];

async function seed() {
  const client = await pool.connect();
  const tenant_id = 'bellad_and_company';

  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL session_replication_role = 'replica';");

    // Inspect vehicles columns
    const vCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicles';");
    const vColList = vCols.rows.map(r => r.column_name);

    for (const item of DUMMY_MODELS) {
      // 1. Clean existing dummy records
      await client.query('DELETE FROM points_ledger WHERE customer_id = $1;', [item.id]);
      await client.query('DELETE FROM customer_phones WHERE customer_id = $1;', [item.id]);
      await client.query('DELETE FROM vehicles WHERE customer_id = $1;', [item.id]);
      await client.query('DELETE FROM customers WHERE customer_id = $1;', [item.id]);

      // 2. Insert customer
      await client.query(`
        INSERT INTO customers (
          customer_id, customer_name, name, tenant_id, branch_name, aadhaar_number,
          visit_type, is_first_time_visitor, is_merged, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          'first_time', true, false, NOW(), NOW()
        );
      `, [item.id, item.name, item.name, tenant_id, item.branch_name, '99990000' + item.phone.slice(-4)]);

      // 3. Insert phone
      await client.query(`
        INSERT INTO customer_phones (
          customer_id, phone_number, is_verified, is_primary, tenant_id, added_at
        ) VALUES (
          $1, $2, true, true, $3, NOW()
        ) ON CONFLICT DO NOTHING;
      `, [item.id, item.phone, tenant_id]);

      // 4. Insert vehicle
      let vInsCols = ['customer_id', 'tenant_id'];
      let vInsVals = [item.id, tenant_id];

      if (vColList.includes('model')) { vInsCols.push('model'); vInsVals.push(item.model); }
      if (vColList.includes('brand_name')) { vInsCols.push('brand_name'); vInsVals.push(item.brand); }
      if (vColList.includes('vehicle_type')) { vInsCols.push('vehicle_type'); vInsVals.push(item.vehicle_type); }
      if (vColList.includes('branch_id')) { vInsCols.push('branch_id'); vInsVals.push(item.branch_id); }
      if (vColList.includes('branch_name')) { vInsCols.push('branch_name'); vInsVals.push(item.branch_name); }
      if (vColList.includes('registration_number')) { vInsCols.push('registration_number'); vInsVals.push(item.reg); }
      if (vColList.includes('vin')) { vInsCols.push('vin'); vInsVals.push(item.vin); }
      if (vColList.includes('chassis_no')) { vInsCols.push('chassis_no'); vInsVals.push(item.vin); }
      if (vColList.includes('ex_showroom_price')) { vInsCols.push('ex_showroom_price'); vInsVals.push(item.price * 100); }
      if (vColList.includes('purchase_date')) { vInsCols.push('purchase_date'); vInsVals.push('2025-05-15'); }
      if (vColList.includes('dms_invoice_date')) { vInsCols.push('dms_invoice_date'); vInsVals.push('2025-05-15'); }
      if (vColList.includes('redemption_status')) { vInsCols.push('redemption_status'); vInsVals.push('eligible'); }
      if (vColList.includes('redemption_eligible_at')) { vInsCols.push('redemption_eligible_at'); vInsVals.push('2026-05-15'); }

      const vPlaceholders = vInsVals.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `INSERT INTO vehicles (${vInsCols.join(', ')}) VALUES (${vPlaceholders});`,
        vInsVals
      );
    }

    console.log(`Inserted ${DUMMY_MODELS.length} dummy customer models.`);

    // 5. Run initial sync to evaluate all active campaigns on these dummy customers
    const syncRes = await CampaignEngineService.syncDummyCustomers(client, tenant_id);
    console.log(`Initial sync completed: ${syncRes.synced_count} models evaluated.`);

    await client.query('COMMIT');
    console.log('✅ Dummy customers for all major models seeded and synced successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
