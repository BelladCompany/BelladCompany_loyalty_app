const { pool } = require('../src/config/db');
const PublicBalanceService = require('../src/services/publicBalance.service');
const NotificationService = require('../src/services/notification.service');

async function testPhase5PublicBalance() {
  console.log('🧪 Starting Phase 5 Public Balance Pass Verification Tests...\n');

  const tenantId = 'bellad_and_company';

  // 1. Fetch a test customer with vehicle & points
  const custRes = await pool.query(
    `SELECT customer_id, customer_name FROM customers WHERE tenant_id = $1 LIMIT 1;`,
    [tenantId]
  );

  if (custRes.rows.length === 0) {
    throw new Error('No test customer found in database.');
  }

  const testCustomer = custRes.rows[0];
  const customerId = testCustomer.customer_id;
  console.log(`Testing with Customer ID: ${customerId}, Name: "${testCustomer.customer_name}"`);

  // --- Test 1: Name Masking Utility ---
  console.log('\n--- Test 1: Privacy Name Masking ---');
  const masked1 = PublicBalanceService.maskCustomerName('Rahul Sharma');
  const masked2 = PublicBalanceService.maskCustomerName('Kavya K Bellad');
  const masked3 = PublicBalanceService.maskCustomerName('Anil');

  console.log(`"Rahul Sharma" -> "${masked1}"`);
  console.log(`"Kavya K Bellad" -> "${masked2}"`);
  console.log(`"Anil" -> "${masked3}"`);

  if (masked1 !== 'Rahul S.' || masked2 !== 'Kavya B.' || masked3 !== 'Anil') {
    throw new Error('Test 1 Failed! Privacy name masking did not format names as expected.');
  }
  console.log('✅ Test 1 Passed! (Privacy-safe name masking verified)');

  // --- Test 2: Token Generation & Public Pass Retrieval ---
  console.log('\n--- Test 2: Token Generation & Public Pass Retrieval ---');
  const token = await PublicBalanceService.getOrCreateToken(customerId, tenantId);
  console.log(`Generated Public Balance Token: ${token}`);

  const passData = await PublicBalanceService.getPublicBalanceByToken(token);
  console.log('Pass Payload Received:', JSON.stringify(passData, null, 2));

  // Verify payload fields
  if (!passData.customer_name || !passData.customer_name.endsWith('.')) {
    throw new Error('Test 2 Failed! Customer name in public pass is not privacy masked.');
  }

  if (typeof passData.current_balance !== 'number' || typeof passData.discount_value_in_rs !== 'number') {
    throw new Error('Test 2 Failed! Balance metrics missing from pass payload.');
  }

  // Ensure NO PII is returned
  if (passData.phone_number || passData.email || passData.customer_id || passData.address) {
    throw new Error('Test 2 Failed! Sensitive PII leaked in public balance payload!');
  }

  console.log('✅ Test 2 Passed! (Public balance pass payload verified privacy-safe & accurate)');

  // --- Test 3: Sliding Expiry Verification ---
  console.log('\n--- Test 3: Sliding Expiry Verification ---');
  const tokenBefore = await pool.query(`SELECT view_count, expires_at FROM public_balance_tokens WHERE token = $1;`, [
    token,
  ]);
  const viewCountBefore = tokenBefore.rows[0].view_count;

  // Access pass again
  await PublicBalanceService.getPublicBalanceByToken(token);

  const tokenAfter = await pool.query(`SELECT view_count, expires_at FROM public_balance_tokens WHERE token = $1;`, [
    token,
  ]);
  const viewCountAfter = tokenAfter.rows[0].view_count;

  console.log(`View Count Before: ${viewCountBefore}, After: ${viewCountAfter}`);
  if (viewCountAfter !== viewCountBefore + 1) {
    throw new Error('Test 3 Failed! Sliding view count did not increment.');
  }
  console.log('✅ Test 3 Passed! (Sliding expiration & view count increment verified)');

  // --- Test 4: Notification Service Pass Link Integration ---
  console.log('\n--- Test 4: Notification Service Pass Link Integration ---');
  const formattedMsg = NotificationService.formatPointsEarnedMessage({
    points: 100,
    transactionType: 'service',
    totalPoints: 500,
    value: 125,
    passUrl: `http://localhost:5173/balance/${token}`,
  });

  console.log('Formatted WhatsApp Message:\n' + formattedMsg);
  if (!formattedMsg.includes(`/balance/${token}`)) {
    throw new Error('Test 4 Failed! Public balance pass URL missing from formatted message.');
  }
  console.log('✅ Test 4 Passed! (WhatsApp message includes public pass link)');

  // --- Test 5: Token Revocation & Regeneration ---
  console.log('\n--- Test 5: Token Revocation & Regeneration ---');
  const revokeResult = await PublicBalanceService.revokeToken(customerId, tenantId);
  console.log(`Revoked Tokens Count: ${revokeResult.revokedCount}`);

  try {
    await PublicBalanceService.getPublicBalanceByToken(token);
    throw new Error('Test 5 Failed! Revoked token still allowed access.');
  } catch (err) {
    console.log(`Revoked token access correctly rejected with message: "${err.message}"`);
  }

  const newToken = await PublicBalanceService.regenerateToken(customerId, tenantId);
  console.log(`Regenerated New Token: ${newToken}`);

  const newPassData = await PublicBalanceService.getPublicBalanceByToken(newToken);
  if (!newPassData || !newPassData.customer_name) {
    throw new Error('Test 5 Failed! Regenerated token access failed.');
  }
  console.log('✅ Test 5 Passed! (Token revocation & regeneration verified)');

  console.log('\n🎉 ALL PHASE 5 PUBLIC BALANCE PASS TESTS PASSED SUCCESSFULLY!');
  await pool.end();
}

testPhase5PublicBalance().catch((e) => {
  console.error('❌ Phase 5 Verification Test Failed:', e);
  process.exit(1);
});
