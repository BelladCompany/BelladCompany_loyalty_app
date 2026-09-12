const { pool } = require('../src/config/db');
const TransactionService = require('../src/services/transaction.service');
const PointsService = require('../src/services/points.service');

async function testPhase2() {
  console.log('🧪 Starting Phase 2 Transaction Sync Verification Tests...');

  const tenantId = 'bellad_and_company';
  
  // Find or create test customer
  let custRes = await pool.query(`SELECT customer_id FROM customers WHERE tenant_id = $1 LIMIT 1;`, [tenantId]);
  let customerId;
  if (custRes.rows.length === 0) {
    const insCust = await pool.query(
      `INSERT INTO customers (customer_name, tenant_id) VALUES ('Test Customer', $1) RETURNING customer_id;`,
      [tenantId]
    );
    customerId = insCust.rows[0].customer_id;
  } else {
    customerId = custRes.rows[0].customer_id;
  }

  console.log(`Using customer_id: ${customerId}`);

  const testJobCard = `JC-TEST-${Date.now()}`;

  // Test 1: Sync new Service transaction (category 'service')
  console.log('\n--- Test 1: Syncing Service Transaction ---');
  const res1 = await TransactionService.syncTransaction({
    category: 'service',
    job_card_number: testJobCard,
    bill_amount: 5000, // Rs 5000 -> 5000 / 100 * 4 = 200 points
    customer_id: customerId,
    branch_id: 1,
    source: 'manual',
    tenant_id: tenantId,
  });

  console.log('Result 1:', {
    status: res1.status,
    points: res1.ledger_entry?.points,
    transaction_category: res1.ledger_entry?.transaction_category,
  });

  if (res1.status !== 'success' || res1.ledger_entry?.points !== 200) {
    throw new Error(`Test 1 Failed! Expected 200 points, got ${res1.ledger_entry?.points}`);
  }
  console.log('✅ Test 1 Passed!');

  // Test 2: Idempotency Check — Re-syncing same job card number
  console.log('\n--- Test 2: Idempotency Check (Duplicate Sync) ---');
  const res2 = await TransactionService.syncTransaction({
    category: 'service',
    job_card_number: testJobCard,
    bill_amount: 5000,
    customer_id: customerId,
    branch_id: 1,
    source: 'manual',
    tenant_id: tenantId,
  });

  console.log('Result 2:', {
    status: res2.status,
    message: res2.message,
  });

  if (res2.status !== 'already_processed') {
    throw new Error(`Test 2 Failed! Expected status 'already_processed', got '${res2.status}'`);
  }
  console.log('✅ Test 2 Passed! (No double crediting occurred)');

  // Test 3: Sync Accessory Transaction (category 'accessory', 2 points per 100)
  console.log('\n--- Test 3: Syncing Accessory Transaction ---');
  const accessoryJobCard = `ACC-TEST-${Date.now()}`;
  const res3 = await TransactionService.syncTransaction({
    category: 'accessory',
    job_card_number: accessoryJobCard,
    bill_amount: 3000, // Rs 3000 -> 3000 / 100 * 2 = 60 points
    customer_id: customerId,
    branch_id: 1,
    source: 'auto_dms',
    tenant_id: tenantId,
  });

  console.log('Result 3:', {
    status: res3.status,
    points: res3.ledger_entry?.points,
  });

  if (res3.status !== 'success' || res3.ledger_entry?.points !== 60) {
    throw new Error(`Test 3 Failed! Expected 60 points for accessory, got ${res3.ledger_entry?.points}`);
  }
  console.log('✅ Test 3 Passed!');

  console.log('\n🎉 ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  await pool.end();
}

testPhase2().catch((e) => {
  console.error('❌ Verification Test Failed:', e);
  process.exit(1);
});
