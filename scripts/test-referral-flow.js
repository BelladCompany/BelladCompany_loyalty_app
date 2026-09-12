require('dotenv').config();
const { pool } = require('../src/config/db');
const CustomerService = require('../src/services/customer.service');
const ReferralService = require('../src/services/referral.service');
const RedemptionService = require('../src/services/redemption.service');
const bcrypt = require('bcryptjs');

async function testReferralFlow() {
  console.log('🧪 Starting Referral Flow Test (Automatic Path A + Manual Fallback Tab B)...');
  const tenantId = process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
  const client = await pool.connect();

  try {
    // Setup test customers and vehicle
    console.log('\n--- Setup Test Data ---');
    
    await client.query(`ALTER TABLE points_ledger DISABLE TRIGGER USER;`);
    await client.query(`DELETE FROM points_ledger WHERE customer_id IN ('BAC-TEST-REF1', 'BAC-TEST-BUYER1');`);
    await client.query(`DELETE FROM referrals WHERE referrer_customer_id = 'BAC-TEST-REF1';`);
    await client.query(`DELETE FROM otp_requests WHERE customer_id = 'BAC-TEST-BUYER1';`);
    await client.query(`DELETE FROM vehicles WHERE chassis_no = 'CHASSIS-REF-TEST-001';`);
    await client.query(`DELETE FROM customer_phones WHERE customer_id IN ('BAC-TEST-REF1', 'BAC-TEST-BUYER1');`);
    await client.query(`DELETE FROM customers WHERE customer_id IN ('BAC-TEST-REF1', 'BAC-TEST-BUYER1');`);
    await client.query(`ALTER TABLE points_ledger ENABLE TRIGGER USER;`);

    // Referrer customer
    const referrerId = 'BAC-TEST-REF1';
    await client.query(`
      INSERT INTO customers (customer_id, customer_name, tenant_id)
      VALUES ($1, 'Referrer Test User', $2)
      ON CONFLICT (customer_id) DO UPDATE SET customer_name = EXCLUDED.customer_name;
    `, [referrerId, tenantId]);

    await client.query(`
      INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
      VALUES ($1, '9888811111', TRUE, $2)
      ON CONFLICT (phone_number) DO NOTHING;
    `, [referrerId, tenantId]);

    // Buyer customer
    const buyerId = 'BAC-TEST-BUYER1';
    await client.query(`
      INSERT INTO customers (customer_id, customer_name, tenant_id)
      VALUES ($1, 'Buyer Test User', $2)
      ON CONFLICT (customer_id) DO UPDATE SET customer_name = EXCLUDED.customer_name;
    `, [buyerId, tenantId]);

    await client.query(`
      INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
      VALUES ($1, '9888822222', TRUE, $2)
      ON CONFLICT (phone_number) DO NOTHING;
    `, [buyerId, tenantId]);

    // Buyer Vehicle with Ex-showroom Price
    const vehRes = await client.query(`
      INSERT INTO vehicles (customer_id, chassis_no, vin, model, ex_showroom_price, tenant_id)
      VALUES ($1, 'CHASSIS-REF-TEST-001', 'VIN-REF-TEST-001', 'Hyundai Creta', 120000000, $2)
      RETURNING vehicle_id;
    `, [buyerId, tenantId]);
    const vehicleId = vehRes.rows[0].vehicle_id;

    console.log(`✅ Referrer: ${referrerId}, Buyer: ${buyerId}, Vehicle ID: ${vehicleId}`);

    // TEST 1: GET /api/customers/by-referral-code/:code (CustomerService.getCustomerByReferralCode)
    console.log('\n--- Test 1: Referral Code Lookup Endpoint ---');
    const refData = await CustomerService.getCustomerByReferralCode('BAC-TEST-REF1', tenantId);
    console.log('✅ Found referrer by customer_id:', refData);
    if (refData.customer_name !== 'Referrer Test User') {
      throw new Error('Referrer name mismatch');
    }

    const refPhoneData = await CustomerService.getCustomerByReferralCode('9888811111', tenantId);
    console.log('✅ Found referrer by phone:', refPhoneData);

    let invalidErr = null;
    try {
      await CustomerService.getCustomerByReferralCode('INVALID-CODE-999', tenantId);
    } catch (e) {
      invalidErr = e;
    }
    console.log('✅ Invalid code correctly rejected:', invalidErr?.message);
    if (invalidErr?.statusCode !== 404) {
      throw new Error('Expected 404 for invalid code');
    }

    // TEST 2: Server-side Enforcement of Vehicle Purchase Context
    console.log('\n--- Test 2: Reject Referral without Vehicle Purchase Context ---');
    // Generate active OTP for buyer
    const otpCode = '123456';
    const otpHash = await bcrypt.hash(otpCode, 8);
    await client.query(`
      INSERT INTO otp_requests (customer_id, otp_hash, purpose, expires_at, tenant_id)
      VALUES ($1, $2, 'redemption', NOW() + INTERVAL '10 minutes', $3);
    `, [buyerId, otpHash, tenantId]);

    let noVehErr = null;
    try {
      await RedemptionService.redeemPoints({
        phone: '9888822222',
        customer_id: buyerId,
        otp: otpCode,
        category: 'referral',
        referral_code: 'BAC-TEST-REF1',
        vehicle_id: null, // Missing vehicle purchase!
        receipt_no: 'REC-TEST-001',
        tenant_id: tenantId,
      });
    } catch (e) {
      noVehErr = e;
    }
    console.log('✅ Non-vehicle purchase correctly rejected:', noVehErr?.message);
    if (noVehErr?.statusCode !== 400 || !noVehErr?.message?.includes('vehicle purchase')) {
      throw new Error(`Expected 400 vehicle purchase error, got: ${JSON.stringify(noVehErr)}`);
    }

    // TEST 3: Reject Self-Referral
    console.log('\n--- Test 3: Reject Self-Referral ---');
    await client.query(`
      INSERT INTO otp_requests (customer_id, otp_hash, purpose, expires_at, tenant_id)
      VALUES ($1, $2, 'redemption', NOW() + INTERVAL '10 minutes', $3);
    `, [buyerId, otpHash, tenantId]);

    let selfRefErr = null;
    try {
      await RedemptionService.redeemPoints({
        phone: '9888822222',
        customer_id: buyerId,
        otp: otpCode,
        category: 'referral',
        referral_code: buyerId, // Self referral!
        vehicle_id: vehicleId,
        receipt_no: 'REC-TEST-002',
        tenant_id: tenantId,
      });
    } catch (e) {
      selfRefErr = e;
    }
    console.log('✅ Self-referral correctly rejected:', selfRefErr?.message);
    if (selfRefErr?.statusCode !== 400 || !selfRefErr?.message?.includes('Self-referral')) {
      throw new Error(`Expected 400 self-referral error, got: ${JSON.stringify(selfRefErr)}`);
    }

    // TEST 4: Successful Dual Credit in Single DB Transaction
    console.log('\n--- Test 4: Successful Dual Credit (Referrer & Buyer) ---');
    await client.query(`
      INSERT INTO otp_requests (customer_id, otp_hash, purpose, expires_at, tenant_id)
      VALUES ($1, $2, 'redemption', NOW() + INTERVAL '10 minutes', $3);
    `, [buyerId, otpHash, tenantId]);

    const result = await RedemptionService.redeemPoints({
      phone: '9888822222',
      customer_id: buyerId,
      otp: otpCode,
      category: 'referral',
      referral_code: 'BAC-TEST-REF1',
      vehicle_id: vehicleId,
      receipt_no: 'REC-TEST-SUCCESS-100',
      account_ledger_no: 'ACC-TEST-100',
      tenant_id: tenantId,
    });

    console.log('🎉 Redemption result:', result);
    if (!result.success || !result.points_awarded || result.points_awarded <= 0) {
      throw new Error('Referral credit failed');
    }

    // Verify DB entries for both Referrer and Buyer
    const refLedger = await client.query(`
      SELECT * FROM points_ledger WHERE customer_id = $1 AND transaction_category = 'referral' AND tenant_id = $2;
    `, [referrerId, tenantId]);

    const buyerLedger = await client.query(`
      SELECT * FROM points_ledger WHERE customer_id = $1 AND transaction_category = 'referral' AND tenant_id = $2;
    `, [buyerId, tenantId]);

    console.log(`✅ Referrer ledger rows: ${refLedger.rows.length}, points: ${refLedger.rows[0]?.points}`);
    console.log(`✅ Buyer ledger rows: ${buyerLedger.rows.length}, points: ${buyerLedger.rows[0]?.points}`);

    if (refLedger.rows.length !== 1 || buyerLedger.rows.length !== 1) {
      throw new Error('Dual credit ledger rows missing');
    }

    // TEST 5: Idempotency Check (Prevent Double Credit)
    console.log('\n--- Test 5: Idempotency Check (Prevent Double Credit) ---');
    await client.query(`
      INSERT INTO otp_requests (customer_id, otp_hash, purpose, expires_at, tenant_id)
      VALUES ($1, $2, 'redemption', NOW() + INTERVAL '10 minutes', $3);
    `, [buyerId, otpHash, tenantId]);

    let doubleCreditErr = null;
    try {
      await RedemptionService.redeemPoints({
        phone: '9888822222',
        customer_id: buyerId,
        otp: otpCode,
        category: 'referral',
        referral_code: 'BAC-TEST-REF1',
        vehicle_id: vehicleId, // Same vehicle already credited!
        receipt_no: 'REC-TEST-DUPLICATE',
        tenant_id: tenantId,
      });
    } catch (e) {
      doubleCreditErr = e;
    }

    console.log('✅ Double credit attempt correctly blocked:', doubleCreditErr?.message);
    if (doubleCreditErr?.statusCode !== 409 || !doubleCreditErr?.message?.includes('already been credited')) {
      throw new Error(`Expected 409 double-credit error, got: ${JSON.stringify(doubleCreditErr)}`);
    }

    console.log('\n✨ ALL REFERRAL FLOW TESTS PASSED SUCCESSFULLY! ✨\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    // Cleanup test data
    await client.query(`ALTER TABLE points_ledger DISABLE TRIGGER USER;`);
    await client.query(`DELETE FROM points_ledger WHERE customer_id IN ('BAC-TEST-REF1', 'BAC-TEST-BUYER1');`);
    await client.query(`DELETE FROM referrals WHERE referrer_customer_id = 'BAC-TEST-REF1';`);
    await client.query(`DELETE FROM otp_requests WHERE customer_id = 'BAC-TEST-BUYER1';`);
    await client.query(`DELETE FROM vehicles WHERE chassis_no = 'CHASSIS-REF-TEST-001';`);
    await client.query(`DELETE FROM customer_phones WHERE customer_id IN ('BAC-TEST-REF1', 'BAC-TEST-BUYER1');`);
    await client.query(`DELETE FROM customers WHERE customer_id IN ('BAC-TEST-REF1', 'BAC-TEST-BUYER1');`);
    await client.query(`ALTER TABLE points_ledger ENABLE TRIGGER USER;`);

    client.release();
    await pool.end();
  }
}

testReferralFlow();
