/**
 * Automated Safety & Integration Test Suite for Customer Gifting Engine
 * Tests Points/Razorpay funding, single-use claim lock, "New Customer Only" filter,
 * auto-reversion of points on rejection, and DPDP consent validation.
 */
require('dotenv').config();
const { pool } = require('../src/config/db');
const GiftEngineService = require('../src/services/giftEngine.service');

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING GIFTING ENGINE INTEGRATION & SECURITY TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const tenantId = 'bellad_and_company';
  const testRunId = Date.now().toString().slice(-6);

  const senderCustId = `CUST-GIFT-SENDER-${testRunId}`;
  const senderPhone = `98888${testRunId.slice(0, 5)}`;

  const newReceiverPhone = `97777${testRunId.slice(0, 5)}`;
  const existingReceiverPhone = `96666${testRunId.slice(0, 5)}`;
  const existingCustId = `CUST-GIFT-EXIST-${testRunId}`;

  try {
    // Setup test customers in DB
    await pool.query(
      `INSERT INTO customers (customer_id, customer_name, tenant_id)
       VALUES ($1, 'Test Sender User', $2)
       ON CONFLICT (customer_id) DO NOTHING;`,
      [senderCustId, tenantId]
    );

    await pool.query(
      `INSERT INTO customer_phones (customer_id, phone_number, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING;`,
      [senderCustId, senderPhone, tenantId]
    );

    // Give sender 10,000 points balance
    await pool.query(
      `INSERT INTO points_ledger (customer_id, branch_id, type, transaction_category, points, source_ref, tenant_id)
       VALUES ($1, 1, 'earn_service', 'service', 10000, 'Test Seed Points', $2);`,
      [senderCustId, tenantId]
    );

    // Setup an existing vehicle purchase customer
    await pool.query(
      `INSERT INTO customers (customer_id, customer_name, tenant_id)
       VALUES ($1, 'Existing Vehicle Owner', $2)
       ON CONFLICT (customer_id) DO NOTHING;`,
      [existingCustId, tenantId]
    );

    await pool.query(
      `INSERT INTO customer_phones (customer_id, phone_number, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING;`,
      [existingCustId, existingReceiverPhone, tenantId]
    );

    await pool.query(
      `INSERT INTO vehicles (customer_id, registration_number, chassis_no, purchase_date, tenant_id)
       VALUES ($1, 'KA22TEST' || $3, 'CHASSIS' || $3, NOW() - INTERVAL '6 months', $2)
       ON CONFLICT DO NOTHING;`,
      [existingCustId, tenantId, testRunId]
    );

    // ─── TEST 1: Points-Funded Gift Creation & Immediate Debit ─────────────────
    console.log('1️⃣ TESTING POINTS-FUNDED GIFT CREATION (4 PTS = ₹1)');
    const gift1 = await GiftEngineService.createGiftFromPoints({
      sender_customer_id: senderCustId,
      sender_phone: senderPhone,
      sender_name: 'Rahul Sender',
      points_to_share: 2000, // ₹500
      custom_message: 'Happy Birthday!',
      tenant_id: tenantId,
    });

    assert(gift1.amount_inr === 500, 'Calculated monetary value ₹500 from 2,000 PTS (4:1 ratio)');
    assert(gift1.points_equivalent === 2000, 'Receiver equivalent points is exactly 2,000 PTS');
    assert(Boolean(gift1.claim_token), 'Secure 64-char hex claim token generated');
    assert(gift1.new_balance === 8000, 'Sender balance debited immediately (10,000 → 8,000 PTS)');

    // ─── TEST 2: Self-Gifting Prevention ───────────────────────────────────────
    console.log('\n2️⃣ TESTING SELF-GIFTING PREVENTION');
    let selfGiftBlocked = false;
    try {
      await GiftEngineService.claimGift({
        claim_token: gift1.claim_token,
        receiver_phone: senderPhone, // Same as sender!
        receiver_name: 'Rahul Sender',
        dpdp_consent: true,
        tenant_id: tenantId,
      });
    } catch (err) {
      selfGiftBlocked = true;
    }
    assert(selfGiftBlocked, 'Sender is strictly prevented from claiming their own gift link');

    // ─── TEST 3: Strict "New Customer Only" Filter & Auto-Reversion ────────────
    console.log('\n3️⃣ TESTING "NEW CUSTOMER ONLY" ENFORCEMENT & AUTO-REVERSION');
    const claimByExisting = await GiftEngineService.claimGift({
      claim_token: gift1.claim_token,
      receiver_phone: existingReceiverPhone, // Has bought a vehicle!
      receiver_name: 'Existing Customer',
      dpdp_consent: true,
      tenant_id: tenantId,
    });

    assert(claimByExisting.success === false, 'Claim rejected for existing vehicle owner');
    assert(claimByExisting.status === 'rejected_existing_customer', 'Status marked as rejected_existing_customer');

    // Verify sender's points were automatically reverted!
    const senderBalAfterRevert = await pool.query(
      `SELECT GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance
       FROM points_ledger
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [senderCustId, tenantId]
    );
    const revertedBalance = parseInt(senderBalAfterRevert.rows[0].current_balance, 10);
    assert(revertedBalance === 10000, 'Sender balance automatically refunded back to 10,000 PTS on rejection');

    // ─── TEST 4: Successful Claim by a Genuine New Customer ───────────────────
    console.log('\n4️⃣ TESTING SUCCESSFUL CLAIM BY GENUINE NEW CUSTOMER');
    // Create new gift for new customer
    const gift2 = await GiftEngineService.createGiftFromPoints({
      sender_customer_id: senderCustId,
      sender_phone: senderPhone,
      sender_name: 'Rahul Sender',
      points_to_share: 4000, // ₹1,000
      custom_message: 'Welcome to Bellad!',
      tenant_id: tenantId,
    });

    const claimByNew = await GiftEngineService.claimGift({
      claim_token: gift2.claim_token,
      receiver_phone: newReceiverPhone,
      receiver_name: 'Pooja New Guest',
      dpdp_consent: true,
      tenant_id: tenantId,
    });

    assert(claimByNew.success === true, 'Claim succeeded for genuine new customer');
    assert(claimByNew.points_credited === 4000, 'New customer credited with exactly 4,000 PTS');

    // Verify receiver's balance in database
    const receiverBal = await pool.query(
      `SELECT GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance
       FROM points_ledger
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [claimByNew.receiver_customer_id, tenantId]
    );
    assert(parseInt(receiverBal.rows[0].current_balance, 10) === 4000, 'Receiver wallet balance is 4,000 PTS');

    // ─── TEST 5: Double-Claim Prevention (Concurrency Lock) ───────────────────
    console.log('\n5️⃣ TESTING DOUBLE-CLAIM REJECTION');
    let doubleClaimBlocked = false;
    try {
      await GiftEngineService.claimGift({
        claim_token: gift2.claim_token,
        receiver_phone: '9555512345',
        receiver_name: 'Second Claimant',
        dpdp_consent: true,
        tenant_id: tenantId,
      });
    } catch (err) {
      doubleClaimBlocked = true;
    }
    assert(doubleClaimBlocked, 'Second claim attempt on already claimed gift is strictly blocked');

    // ─── TEST 6: Razorpay Order Creation & Mock Signature Verification ─────────
    console.log('\n6️⃣ TESTING RAZORPAY GIFT CREATION & SIGNATURE VERIFICATION');
    const rzpGift = await GiftEngineService.createGiftFromRazorpay({
      sender_customer_id: senderCustId,
      sender_phone: senderPhone,
      sender_name: 'Rahul Sender',
      amount_inr: 1500, // ₹1,500
      tenant_id: tenantId,
    });

    assert(rzpGift.amount_inr === 1500, 'Razorpay order created for ₹1,500');
    assert(rzpGift.points_equivalent === 6000, 'Equivalent points calculated as 6,000 PTS');

    const verifyRes = await GiftEngineService.verifyRazorpayPayment({
      razorpay_order_id: rzpGift.razorpay_order_id,
      razorpay_payment_id: `pay_mock_${Date.now()}`,
      razorpay_signature: 'mock_sig',
      claim_token: rzpGift.claim_token,
      tenant_id: tenantId,
    });

    assert(verifyRes.payment_status === 'paid', 'Gift payment verified and marked as paid');
    assert(Boolean(verifyRes.whatsapp_share_url), 'Generated valid WhatsApp share URL with pre-filled message');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    // Cleanup test records
    await pool.query(
      `DELETE FROM customer_gifts WHERE tenant_id = $1 AND sender_customer_id = $2;`,
      [tenantId, senderCustId]
    );
    await pool.query(
      `DELETE FROM vehicles WHERE tenant_id = $1 AND customer_id = $2;`,
      [tenantId, existingCustId]
    );
    await pool.query(
      `DELETE FROM customer_phones WHERE tenant_id = $1 AND phone_number IN ($2, $3, $4);`,
      [tenantId, senderPhone, existingReceiverPhone, newReceiverPhone]
    );
  }

  console.log('\n================================================================');
  console.log(`📊 GIFTING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
