require('dotenv').config();
const { pool } = require('./src/config/db');
const { hashIdentifier, encrypt } = require('./src/utils/crypto.util');

async function seedRahulSharma() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantId = 'bellad_and_company';
    const customerId = 'BAC-RAHUL-SHARMA-01';
    const name = 'Rahul Sharma';
    const phone = '9888877777';
    const aadhaar = '999988887777';
    const aadhaarHash = hashIdentifier(aadhaar);
    const aadhaarEnc = encrypt(aadhaar.slice(-4));

    // 1. Delete prior test entries if any
    await client.query('DELETE FROM points_ledger WHERE customer_id = $1;', [customerId]);
    await client.query('DELETE FROM customer_tier_snapshot WHERE customer_id = $1;', [customerId]);
    await client.query('DELETE FROM vehicles WHERE customer_id = $1;', [customerId]);
    await client.query('DELETE FROM customer_phones WHERE phone_number = $1 OR customer_id = $2;', [phone, customerId]);
    await client.query('DELETE FROM customers WHERE customer_id = $1;', [customerId]);

    // 2. Insert customer
    await client.query(`
      INSERT INTO customers (
        customer_id, customer_name, aadhaar_hash, aadhaar_last4_enc, aadhaar_number,
        email, branch_name, firm_name, visit_type, is_first_time_visitor, tenant_id,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'repeat_customer', false, $9, NOW(), NOW());
    `, [
      customerId, name, aadhaarHash, aadhaarEnc, aadhaar,
      'rahul.sharma@dealership.com', 'Hubli Main Branch', 'Bellad & Company Hubli', tenantId
    ]);

    // 3. Insert phone
    await client.query(`
      INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
      VALUES ($1, $2, true, $3);
    `, [customerId, phone, tenantId]);

    // 4. Insert vehicles
    const vRes = await client.query(`
      INSERT INTO vehicles (
        customer_id, registration_number, vin, chassis_no, model, variant,
        fuel_type, brand_name, branch_name, vehicle_type, tenant_id
      )
      VALUES 
      ($1, 'KA-25-EM-1234', 'MBLHA10EM98765432', 'MBLHA10EM98765432', 'Splendor Plus', 'Drum Self Cast', 'Petrol', 'Hero', 'Hubli Main Branch', '2W', $2),
      ($1, 'KA-25-MB-5678', 'MAT621045P1234567', 'MAT621045P1234567', 'Nexon', 'Creative Plus', 'Petrol', 'Tata Motors', 'Hubli Main Branch', '4W', $2)
      RETURNING vehicle_id;
    `, [customerId, tenantId]);

    const vehicleId1 = vRes.rows[0].vehicle_id;

    // 5. Insert tier snapshot
    await client.query(`
      INSERT INTO customer_tier_snapshot (customer_id, tenant_id, current_tier, lifetime_points, total_expense_amount, updated_at)
      VALUES ($1, $2, 'Silver', 2450, 85000, NOW());
    `, [customerId, tenantId]);

    // 6. Insert points ledger entries (earning points)
    await client.query(`
      INSERT INTO points_ledger (
        tenant_id, customer_id, vehicle_id, type, points, source_ref, transaction_category, reason_text, created_at
      )
      VALUES 
      ($1, $2, $3, 'earn', 1500, 'INV-HERO-2026-99', 'sale', 'Hero Splendor Plus Purchase (5% Discount + 1.5x Multiplier applied)', NOW() - INTERVAL '5 days'),
      ($1, $2, $3, 'earn', 950, 'JC-SRV-2026-101', 'service', '1st Free Periodic Maintenance & Genuine Engine Oil', NOW() - INTERVAL '1 day');
    `, [tenantId, customerId, vehicleId1]);

    await client.query('COMMIT');
    console.log('✅ Rahul Sharma successfully seeded with vehicles & 2,450 points!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding Rahul Sharma:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRahulSharma();
