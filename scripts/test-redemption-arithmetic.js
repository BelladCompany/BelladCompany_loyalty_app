// scripts/test-redemption-arithmetic.js
const { POINTS_PER_RUPEE_REDEMPTION, POINTS_PER_100_RUPEES_EARNED } = require('../src/config/loyalty.config');
const { pool } = require('../src/config/db');
const RedemptionService = require('../src/services/redemption.service');

function testPureArithmetic() {
  console.log('--- Pure Arithmetic Test ---');
  const current_point_balance = 1000;
  const bill_amount = 1200;

  const redeemable_rupees = current_point_balance * POINTS_PER_RUPEE_REDEMPTION;
  const discount_applied = Math.min(redeemable_rupees, bill_amount);
  const points_redeemed = Math.round(discount_applied / POINTS_PER_RUPEE_REDEMPTION);
  const cash_paid = bill_amount - discount_applied;
  const new_points_earned = Math.floor((cash_paid / 100) * POINTS_PER_100_RUPEES_EARNED);
  const final_balance = (current_point_balance - points_redeemed) + new_points_earned;

  console.log({
    redeemable_rupees,
    discount_applied,
    points_redeemed,
    cash_paid,
    new_points_earned,
    final_balance,
  });

  if (redeemable_rupees !== 250) throw new Error(`Expected redeemable_rupees 250, got ${redeemable_rupees}`);
  if (discount_applied !== 250) throw new Error(`Expected discount_applied 250, got ${discount_applied}`);
  if (points_redeemed !== 1000) throw new Error(`Expected points_redeemed 1000, got ${points_redeemed}`);
  if (cash_paid !== 950) throw new Error(`Expected cash_paid 950, got ${cash_paid}`);
  if (new_points_earned !== 38) throw new Error(`Expected new_points_earned 38, got ${new_points_earned}`);
  if (final_balance !== 38) throw new Error(`Expected final_balance 38, got ${final_balance}`);

  console.log('✅ Pure Arithmetic Test PASSED EXACTLY!');
}

async function testDatabaseTransaction() {
  console.log('\n--- Database Transaction Test ---');
  const client = await pool.connect();
  const testPhone = '9999999999';
  const testTenant = 'default';
  const testOtp = '123456';
  const bcrypt = require('bcryptjs');

  try {
    await client.query('BEGIN');

    // Cleanup
    await pool.query(`ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;`);
    await pool.query(`DELETE FROM points_ledger WHERE customer_id = 'CUST-TEST-RED';`);
    await pool.query(`ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;`);
    await pool.query(`DELETE FROM redemptions WHERE customer_id = 'CUST-TEST-RED';`);
    await pool.query(`DELETE FROM otp_requests WHERE customer_id = 'CUST-TEST-RED';`);
    await pool.query(`DELETE FROM customer_phones WHERE customer_id = 'CUST-TEST-RED';`);
    await pool.query(`DELETE FROM customers WHERE customer_id = 'CUST-TEST-RED';`);

    // 2. Create test customer
    await client.query(
      `INSERT INTO customers (customer_id, customer_name, tenant_id) VALUES ('CUST-TEST-RED', 'Test Redeemer', $1);`,
      [testTenant]
    );
    await client.query(
      `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id) VALUES ('CUST-TEST-RED', $1, true, $2);`,
      [testPhone, testTenant]
    );

    // 3. Give 1000 points balance
    await client.query(
      `INSERT INTO points_ledger (customer_id, type, transaction_category, points, tenant_id) VALUES ('CUST-TEST-RED', 'sale', 'sale', 1000, $1);`,
      [testTenant]
    );

    // 4. Create active OTP
    const otpHash = await bcrypt.hash(testOtp, 8);
    await client.query(
      `INSERT INTO otp_requests (customer_id, otp_hash, purpose, expires_at, tenant_id)
       VALUES ('CUST-TEST-RED', $1, 'redemption', NOW() + INTERVAL '10 minutes', $2);`,
      [otpHash, testTenant]
    );

    await client.query('COMMIT');

    // 5. Run RedemptionService.redeemPoints with bill_amount = 1200
    const res = await RedemptionService.redeemPoints({
      customer_id: 'CUST-TEST-RED',
      phone: testPhone,
      otp: testOtp,
      bill_amount: 1200,
      category: 'service',
      receipt_no: 'REC-TEST-001',
      account_ledger_no: 'ACC-TEST-001',
      branch_id: 1,
      tenant_id: testTenant,
    });

    console.log('Service Result:', {
      discount_applied: res.discount_applied,
      points_redeemed: res.points_redeemed,
      cash_paid: res.cash_paid,
      new_points_earned: res.new_points_earned,
      updated_total_balance: res.updated_total_balance,
      receipt_no: res.receipt_no,
      account_ledger_no: res.account_ledger_no,
    });

    if (res.discount_applied !== 250) throw new Error(`discount_applied error: ${res.discount_applied}`);
    if (res.points_redeemed !== 1000) throw new Error(`points_redeemed error: ${res.points_redeemed}`);
    if (res.cash_paid !== 950) throw new Error(`cash_paid error: ${res.cash_paid}`);
    if (res.new_points_earned !== 38) throw new Error(`new_points_earned error: ${res.new_points_earned}`);
    if (res.updated_total_balance !== 38) throw new Error(`updated_total_balance error: ${res.updated_total_balance}`);

    console.log('✅ Database Transaction Test PASSED EXACTLY!');

    // Cleanup
    await pool.query(`ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;`);
    await pool.query(`DELETE FROM points_ledger WHERE customer_id = 'CUST-TEST-RED';`);
    await pool.query(`ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;`);
    await pool.query(`DELETE FROM redemptions WHERE customer_id = 'CUST-TEST-RED';`);
    await pool.query(`DELETE FROM otp_requests WHERE customer_id = 'CUST-TEST-RED';`);
    await pool.query(`DELETE FROM customer_phones WHERE customer_id = 'CUST-TEST-RED';`);
    await pool.query(`DELETE FROM customers WHERE customer_id = 'CUST-TEST-RED';`);

  } catch (err) {
    console.error('❌ DB Transaction Test Failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testPureArithmetic();
testDatabaseTransaction();
