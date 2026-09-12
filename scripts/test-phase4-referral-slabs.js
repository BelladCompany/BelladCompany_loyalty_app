const { pool } = require('../src/config/db');
const ReferralService = require('../src/services/referral.service');
const TransactionService = require('../src/services/transaction.service');

async function testPhase4ReferralSlabs() {
  console.log('🧪 Starting Phase 4 Referral Slabs Auto-Calculation Verification Tests...');

  const tenantId = 'bellad_and_company';

  // 1. Create unique referrer and referred test customers
  const timestamp = Date.now();
  const insReferrer = await pool.query(
    `INSERT INTO customers (customer_name, tenant_id) VALUES ($1, $2) RETURNING customer_id;`,
    [`Referrer Customer ${timestamp}`, tenantId]
  );
  const referrerId = insReferrer.rows[0].customer_id;

  const insReferred = await pool.query(
    `INSERT INTO customers (customer_name, tenant_id) VALUES ($1, $2) RETURNING customer_id;`,
    [`Referred Friend ${timestamp}`, tenantId]
  );
  const referredId = insReferred.rows[0].customer_id;

  console.log(`Referrer ID: ${referrerId}, Referred ID: ${referredId}`);

  // 2. Register referral in pending status
  console.log('\n--- Test 1: Registering Referral ---');
  const regRes = await ReferralService.registerReferral({
    referrer_customer_id: referrerId,
    referred_customer_id: referredId,
    tenant_id: tenantId,
  });

  const referralId = regRes.id || regRes.referral_id;
  console.log(`Registered referral ID #${referralId}, Status: ${regRes.status}`);

  if (regRes.status !== 'pending' || Number(regRes.points_awarded || 0) !== 0) {
    throw new Error('Test 1 Failed! Expected pending referral with 0 points.');
  }
  console.log('✅ Test 1 Passed!');

  // 3. Register vehicle for referred customer (4W category)
  const vehRes = await pool.query(
    `INSERT INTO vehicles (customer_id, model, vehicle_type, tenant_id)
     VALUES ($1, 'TATA HARRIER 4W', '4W', $2)
     RETURNING vehicle_id;`,
    [referredId, tenantId]
  );
  const vehicleId = vehRes.rows[0].vehicle_id;

  // 4. Sync vehicle sale transaction (Rs 850,000 -> 85,000,000 paise -> 4W 5-10L slab -> 2500 pts)
  console.log('\n--- Test 2: Syncing Sale Transaction for Referred Customer ---');
  const saleRes = await TransactionService.syncTransaction({
    category: 'sale',
    job_card_number: `INV-SALE-${timestamp}`,
    reference_id: `INV-SALE-${timestamp}`,
    bill_amount: 850000, // Rs 8,50,000 ex-showroom
    customer_id: referredId,
    vehicle_id: vehicleId,
    branch_id: 1,
    source: 'auto_dms',
    tenant_id: tenantId,
  });

  console.log('Sale Tx Status:', saleRes.status);

  // 5. Verify referral record was auto-updated with suggested points from slab 5-10L (2500 pts)
  const checkRefRes = await pool.query(
    `SELECT status, points_credited, suggested_points, reason FROM referrals WHERE referral_id = $1;`,
    [referralId]
  );

  const updatedRef = checkRefRes.rows[0];
  console.log('Auto-Updated Referral Record:', updatedRef);

  if (updatedRef.status !== 'pending') {
    throw new Error(`Test 2 Failed! Status should remain 'pending', got '${updatedRef.status}'`);
  }
  if (parseInt(updatedRef.suggested_points, 10) !== 2500) {
    throw new Error(`Test 2 Failed! Expected 2500 suggested points for 5-10L slab, got ${updatedRef.suggested_points}`);
  }
  if (!updatedRef.reason?.includes('5-10L')) {
    throw new Error(`Test 2 Failed! Expected slab label '5-10L' in reason, got '${updatedRef.reason}'`);
  }
  console.log('✅ Test 2 Passed! (Slab matched: 5-10L -> 2500 suggested points pre-filled, status stays pending)');

  // 6. Test Manual Approver Sign-Off with Suggested Points
  console.log('\n--- Test 3: Approver Sign-Off & Ledger Credit ---');
  const approveRes = await ReferralService.approveReferral({
    referral_id: referralId,
    points: 2500,
    reason: updatedRef.reason,
    current_user_id: 1,
    tenant_id: tenantId,
  });

  console.log('Approval Result Status:', approveRes.referral.status);
  console.log('Awarded Points to Referrer:', approveRes.referral.points_awarded);

  if (approveRes.referral.status !== 'approved' || parseInt(approveRes.referral.points_awarded, 10) !== 2500) {
    throw new Error('Test 3 Failed! Referral approval failed or incorrect points awarded.');
  }

  // Verify Audit Log entry
  const auditRes = await pool.query(
    `SELECT action, entity_id, after_json FROM audit_log WHERE entity_id = $1 AND action = 'points_earn_referral' ORDER BY created_at DESC LIMIT 1;`,
    [referrerId]
  );

  if (auditRes.rows.length === 0) {
    throw new Error('Test 3 Failed! No audit_log entry written for referral approval.');
  }

  console.log('Audit Log after_json:', auditRes.rows[0].after_json);
  console.log('✅ Test 3 Passed! (Points credited to referrer, tier snapshot updated, audit log written)');

  console.log('\n🎉 ALL PHASE 4 REFERRAL SLABS VERIFICATION TESTS PASSED SUCCESSFULLY!');
  await pool.end();
}

testPhase4ReferralSlabs().catch((e) => {
  console.error('❌ Phase 4 Verification Test Failed:', e);
  process.exit(1);
});
