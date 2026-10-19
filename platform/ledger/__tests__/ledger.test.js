require('dotenv').config();
const assert = require('assert');
const { pool } = require('../../../src/config/db');
const PlatformLedgerService = require('../ledger.service');

async function runLedgerTests() {
  console.log('🧪 Running Financial-Grade Ledger Test Suite...\n');

  const testTenant = 'bellad_and_company';
  const testCustomer = 'BAC-LEDGER-TEST-' + Date.now();
  const testIdempKey = 'IDEMP-' + Date.now();

  try {
    // 0. Seed test customer
    await pool.query(
      `INSERT INTO customers (customer_id, customer_name, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (customer_id) DO NOTHING;`,
      [testCustomer, 'Ledger Test Customer', testTenant]
    );

    // TEST 1: Initial Earn
    console.log('Test 1: Record Earning with Idempotency Key');
    const earnRes1 = await PlatformLedgerService.recordEarn({
      tenant_id: testTenant,
      customer_id: testCustomer,
      points: 500,
      transaction_category: 'service',
      idempotency_key: testIdempKey,
      reference_id: 'JC-1001',
    });
    assert.strictEqual(earnRes1.status, 'success');
    assert.strictEqual(earnRes1.points_credited, 500);
    assert.strictEqual(earnRes1.balance_after, 500);
    console.log(`  ✅ Earned 500 points. Balance: ${earnRes1.balance_after}`);

    // TEST 2: Idempotent Retry (Exact duplicate call with same Idempotency-Key)
    console.log('\nTest 2: Idempotent Duplicate Detection');
    const earnRes2 = await PlatformLedgerService.recordEarn({
      tenant_id: testTenant,
      customer_id: testCustomer,
      points: 500,
      transaction_category: 'service',
      idempotency_key: testIdempKey,
      reference_id: 'JC-1001',
    });
    assert.strictEqual(earnRes2.status, 'deduplicated');
    console.log('  ✅ Duplicate request detected; zero extra points credited.');

    // Verify balance is still strictly 500
    const balCheck = await pool.query(
      `SELECT SUM(points) as bal FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
      [testCustomer, testTenant]
    );
    assert.strictEqual(parseInt(balCheck.rows[0].bal, 10), 500);
    console.log('  ✅ Balance verified strictly unchanged at 500 points.');

    // TEST 3: Overdraft Prevention
    console.log('\nTest 3: Concurrency Overdraft Prevention (Redeem > Balance)');
    try {
      await PlatformLedgerService.recordRedeem({
        tenant_id: testTenant,
        customer_id: testCustomer,
        points: 800, // Balance is only 500!
        redemption_code: 'RDM-TEST-OVERDRAFT',
      });
      assert.fail('Should have rejected overdraft redemption');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Insufficient points'));
      console.log('  ✅ Overdraft correctly blocked by pessimistic balance verification.');
    }

    // TEST 4: Valid Redemption
    console.log('\nTest 4: Valid Redemption (200 points)');
    const redeemIdempKey = 'IDEMP-RDM-' + Date.now();
    const redeemRes = await PlatformLedgerService.recordRedeem({
      tenant_id: testTenant,
      customer_id: testCustomer,
      points: 200,
      redemption_code: 'RDM-TEST-VALID',
      idempotency_key: redeemIdempKey,
    });
    assert.strictEqual(redeemRes.status, 'success');
    assert.strictEqual(redeemRes.balance_after, 300);
    assert.strictEqual(redeemRes.discount_rupees, 50); // 200 pts * 0.25 = ₹50
    console.log(`  ✅ Redeemed 200 points (₹50 discount). Remaining balance: ${redeemRes.balance_after}`);

    // TEST 5: Compensating Adjustment
    console.log('\nTest 5: Compensating Adjustment (Zero in-place updates)');
    const adjustRes = await PlatformLedgerService.recordCompensatingAdjustment({
      tenant_id: testTenant,
      customer_id: testCustomer,
      points_delta: 50,
      reason: 'Goodwill counter adjustment authorized by Manager',
      authorized_by: 'manager_belgaum',
    });
    assert.strictEqual(adjustRes.status, 'success');
    assert.strictEqual(adjustRes.balance_after, 350);
    console.log(`  ✅ Compensating entry created (+50 pts). New balance: ${adjustRes.balance_after}`);

    // TEST 6: Strict Append-Only Trigger Verification
    console.log('\nTest 6: Database Trigger Append-Only Enforcement');
    try {
      await pool.query('DELETE FROM points_ledger WHERE customer_id = $1;', [testCustomer]);
      assert.fail('Database trigger should have blocked DELETE on points_ledger');
    } catch (err) {
      assert.ok(
        err.message.includes('points_ledger is strictly append-only') || err.message.includes('not permitted'),
        `Expected append-only error, got: ${err.message}`
      );
      console.log('  ✅ PostgreSQL trigger trg_prevent_points_ledger_modification successfully blocked DELETE!');
    }

    // TEST 7: Reconcile Customer Balances
    console.log('\nTest 7: Daily Reconciliation Job');
    const reconRows = await PlatformLedgerService.reconcileCustomerBalances(testTenant);
    const testRecon = reconRows.find((r) => r.customer_id === testCustomer);
    assert.ok(testRecon, 'Reconciliation should include test customer');
    assert.strictEqual(parseInt(testRecon.ledger_balance, 10), 350, 'Reconciled balance must be 350');
    console.log(`  ✅ Reconciled customer balance matches ledger sum (350 points across ${testRecon.total_transactions} txs).`);

    console.log('\n🎉 ALL FINANCIAL-GRADE LEDGER TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Ledger Test Failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runLedgerTests();
