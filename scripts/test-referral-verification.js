require('dotenv').config();
const { pool } = require('../src/config/db');
const CustomerService = require('../src/services/customer.service');
const ReferralService = require('../src/services/referral.service');

async function runTest() {
  console.log('🧪 Starting 2-Account Referral & Vehicle Purchase Verification Test...\n');
  const tenantId = process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
  const client = await pool.connect();

  const ref1 = 'BAC-TEST-ACC1';
  const ref2 = 'BAC-TEST-ACC2';

  try {
    // 1. Cleanup old test data
    console.log('Step 1: Setting up 2 test customer accounts...');
    await client.query(`DELETE FROM audit_log WHERE entity_id IN ($1, $2);`, [ref1, ref2]);
    await client.query(`DELETE FROM points_ledger WHERE customer_id IN ($1, $2);`, [ref1, ref2]);
    await client.query(`DELETE FROM referrals WHERE (referrer_customer_id = $1 AND referred_customer_id = $2) OR (referrer_customer_id = $2 AND referred_customer_id = $1);`, [ref1, ref2]);
    await client.query(`DELETE FROM referral_leads WHERE referrer_customer_id IN ($1, $2);`, [ref1, ref2]);
    await client.query(`DELETE FROM vehicles WHERE customer_id IN ($1, $2);`, [ref1, ref2]);
    await client.query(`DELETE FROM customer_phones WHERE customer_id IN ($1, $2);`, [ref1, ref2]);
    await client.query(`DELETE FROM customers WHERE customer_id IN ($1, $2);`, [ref1, ref2]);

    // Create Account 1 (Referrer)
    await client.query(`
      INSERT INTO customers (customer_id, customer_name, tenant_id)
      VALUES ($1, 'Pooja Referrer', $2);
    `, [ref1, tenantId]);
    await client.query(`
      INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
      VALUES ($1, '9880199001', true, $2);
    `, [ref1, tenantId]);

    // Create Account 2 (Referred Friend)
    await client.query(`
      INSERT INTO customers (customer_id, customer_name, tenant_id)
      VALUES ($1, 'Suresh Referee', $2);
    `, [ref2, tenantId]);
    await client.query(`
      INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
      VALUES ($1, '9880199002', true, $2);
    `, [ref2, tenantId]);

    console.log('✅ Accounts created:', ref1, 'and', ref2);

    // 2. Link referral (as happens during ?ref=BAC-TEST-ACC1 enrollment)
    console.log('\nStep 2: Linking Account 2 to Account 1 referral code...');
    const linkRes = await ReferralService.linkCustomerReferral({
      referrer_code: ref1,
      referred_customer_id: ref2,
      tenant_id: tenantId,
    });
    console.log('✅ Referral record created:', linkRes);
    const referralId = linkRes.referral_id;

    // 3. Check Account 1 Summary (Referrer)
    console.log('\nStep 3: Checking Account 1 (Referrer) summary before vehicle purchase...');
    const acc1SummaryBefore = await ReferralService.getCustomerReferralSummary(ref1, tenantId);
    console.log('Account 1 Summary:', {
      total_referrals: acc1SummaryBefore.total_referrals,
      locked_points: acc1SummaryBefore.locked_points,
      ready_to_claim_points: acc1SummaryBefore.ready_to_claim_points,
      referrals: acc1SummaryBefore.referrals,
    });

    if (acc1SummaryBefore.locked_points !== 2500) {
      throw new Error(`Expected locked_points=2500 on Account 1, got ${acc1SummaryBefore.locked_points}`);
    }
    if (acc1SummaryBefore.referrals[0].can_claim !== false) {
      throw new Error(`Account 1 can_claim should be FALSE before purchase`);
    }

    // 4. Check Account 2 Summary (Referred Friend)
    console.log('\nStep 4: Checking Account 2 (Referee) summary before vehicle purchase...');
    const acc2SummaryBefore = await ReferralService.getCustomerReferralSummary(ref2, tenantId);
    console.log('Account 2 Summary:', {
      total_referrals: acc2SummaryBefore.total_referrals,
      locked_points: acc2SummaryBefore.locked_points,
      ready_to_claim_points: acc2SummaryBefore.ready_to_claim_points,
      referrals: acc2SummaryBefore.referrals,
    });

    if (acc2SummaryBefore.locked_points !== 2500) {
      throw new Error(`Expected locked_points=2500 on Account 2, got ${acc2SummaryBefore.locked_points}`);
    }
    if (acc2SummaryBefore.referrals[0].can_claim !== false) {
      throw new Error(`Account 2 can_claim should be FALSE before purchase`);
    }

    // 5. Attempt claim before vehicle purchase (must fail)
    console.log('\nStep 5: Testing claim prevention before vehicle purchase...');
    let prevented = false;
    try {
      await ReferralService.claimReferralReward({
        referral_id: referralId,
        customer_id: ref1,
        tenant_id: tenantId,
      });
    } catch (e) {
      prevented = true;
      console.log('✅ Correctly blocked claim with message:', e.message);
    }
    if (!prevented) {
      throw new Error('Claim should have been blocked before vehicle purchase!');
    }

    // 6. Record Vehicle Purchase & PR for Account 2 (Referee)
    console.log('\nStep 6: Recording vehicle purchase & PR for Account 2 at Bellad Dealership...');
    await client.query(`
      INSERT INTO vehicles (
        customer_id, chassis_no, vin, model, registration_number, dms_invoice_number, 
        branch_name, ex_showroom_price, tenant_id
      )
      VALUES (
        $1, 'CHASSIS-TEST-ACC2', 'VIN-TEST-ACC2', 'Tata Nexon EV Dark', 'KA-25-EM-9999', 
        'INV-2026-BEL-001', 'Bellad & Co Hubballi', 150000000, $2
      );
    `, [ref2, tenantId]);
    console.log('✅ Vehicle purchase recorded for', ref2);

    // 7. Verify Account 1 and Account 2 now show ready_to_claim = true
    console.log('\nStep 7: Checking referral summary after vehicle purchase...');
    const acc1SummaryAfter = await ReferralService.getCustomerReferralSummary(ref1, tenantId);
    console.log('Account 1 Summary after purchase:', {
      locked_points: acc1SummaryAfter.locked_points,
      ready_to_claim_points: acc1SummaryAfter.ready_to_claim_points,
      ready_to_claim_count: acc1SummaryAfter.ready_to_claim_count,
      status: acc1SummaryAfter.referrals[0].status,
      can_claim: acc1SummaryAfter.referrals[0].can_claim,
    });

    if (acc1SummaryAfter.ready_to_claim_points !== 2500 || !acc1SummaryAfter.referrals[0].can_claim) {
      throw new Error('Account 1 should be ready to claim after vehicle purchase!');
    }

    // 8. Execute Claim
    console.log('\nStep 8: Account 1 executes Claim...');
    const claimRes = await ReferralService.claimReferralReward({
      referral_id: referralId,
      customer_id: ref1,
      tenant_id: tenantId,
    });
    console.log('✅ Claim result:', claimRes);

    // 9. Verify points_ledger for BOTH accounts
    console.log('\nStep 9: Verifying points_ledger for BOTH accounts...');
    const ref1Ledger = await client.query(`SELECT customer_id, points, type, transaction_category, source_ref FROM points_ledger WHERE customer_id = $1;`, [ref1]);
    const ref2Ledger = await client.query(`SELECT customer_id, points, type, transaction_category, source_ref FROM points_ledger WHERE customer_id = $1;`, [ref2]);

    console.log('Account 1 Ledger entries:', ref1Ledger.rows);
    console.log('Account 2 Ledger entries:', ref2Ledger.rows);

    if (ref1Ledger.rows.length === 0 || ref1Ledger.rows[0].points !== 2500) {
      throw new Error('Account 1 was not credited 2500 points!');
    }
    if (ref2Ledger.rows.length === 0 || ref2Ledger.rows[0].points !== 2500) {
      throw new Error('Account 2 was not credited 2500 points!');
    }

    // 10. Verify audit log
    const auditRes = await client.query(`SELECT * FROM audit_log WHERE entity_type = 'referral' AND entity_id = $1;`, [String(referralId)]);
    console.log('\nStep 10: Audit log entry verified:', auditRes.rows.length > 0 ? 'YES' : 'NO');

    console.log('\n🎉 ALL REFERRAL SYSTEM TESTS PASSED SUCCESSFULLY! Both accounts correctly get points with vehicle purchase enforcement.');
  } finally {
    client.release();
    await pool.end();
  }
}

runTest().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
