const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
const KycService = require('../src/services/kyc.service');
const RedemptionService = require('../src/services/redemption.service');
const { encrypt, decrypt } = require('../src/utils/crypto.util');

async function testPhase3Kyc() {
  console.log('🧪 Starting Phase 3 KYC Change Request Flow Verification Tests...');

  const tenantId = 'bellad_and_company';

  // 1. Find test customer with a phone number
  const custRes = await pool.query(
    `SELECT c.customer_id, cp.phone_number
     FROM customers c
     JOIN customer_phones cp ON c.customer_id = cp.customer_id
     WHERE c.tenant_id = $1
     LIMIT 1;`,
    [tenantId]
  );

  if (custRes.rows.length === 0) {
    throw new Error('No customer with phone number found in DB for testing.');
  }

  const testCustomer = custRes.rows[0];
  const customerId = testCustomer.customer_id;
  const oldPhone = testCustomer.phone_number;
  console.log(`Testing with customer: ${customerId}, Old Phone: ${oldPhone}`);

  // 2. Request OTP to OLD phone number
  console.log('\n--- Test 1: Requesting OTP to Old Phone ---');
  const otpRes = await RedemptionService.requestOtp({
    phone: oldPhone,
    customer_id: customerId,
    tenant_id: tenantId,
  });

  const otpCode = otpRes.debug_otp || '123456';
  console.log(`Generated OTP for ${oldPhone}: ${otpCode}`);

  // 3. Submit KYC Change Request
  console.log('\n--- Test 2: Submitting KYC Phone Update Request ---');
  const newPhone = `99${Math.floor(10000000 + Math.random() * 90000000)}`;
  const submitRes = await KycService.submitChangeRequest({
    customer_id: customerId,
    change_type: 'phone_update',
    new_value: newPhone,
    reason: 'Customer updated mobile number at counter',
    id_proof_type: 'Aadhaar',
    id_proof_file_url: '/uploads/kyc_proofs/sample_aadhaar.jpg',
    otp: otpCode,
    requested_by: 1,
    tenant_id: tenantId,
  });

  console.log('Submit Result:', {
    status: submitRes.status,
    requestId: submitRes.request.id,
    newPhone: submitRes.request.new_value,
  });

  if (submitRes.status !== 'pending' || !submitRes.request.id) {
    throw new Error('Test 2 Failed! Expected pending KYC request.');
  }

  const requestId = submitRes.request.id;

  // Verify phone was NOT updated yet in customer_phones
  const checkPhoneRes = await pool.query(
    `SELECT phone_number FROM customer_phones WHERE customer_id = $1 AND tenant_id = $2;`,
    [customerId, tenantId]
  );
  if (checkPhoneRes.rows[0].phone_number !== oldPhone) {
    throw new Error('Test 2 Failed! Phone number was prematurely updated before admin approval.');
  }
  console.log('✅ Test 2 Passed! (Request submitted as pending; customer_phones unchanged)');

  // 4. Verify Encryption at Rest
  console.log('\n--- Test 3: Verifying AES-256-GCM Encryption at Rest ---');
  const rawDbRow = await pool.query(
    `SELECT id_proof_file_url FROM kyc_change_requests WHERE id = $1;`,
    [requestId]
  );
  const encryptedInDb = rawDbRow.rows[0].id_proof_file_url;
  console.log('Raw DB Value:', encryptedInDb);
  const decryptedVal = decrypt(encryptedInDb);
  console.log('Decrypted Value:', decryptedVal);

  if (encryptedInDb === '/uploads/kyc_proofs/sample_aadhaar.jpg') {
    throw new Error('Test 3 Failed! File URL was stored unencrypted in DB.');
  }
  if (decryptedVal !== '/uploads/kyc_proofs/sample_aadhaar.jpg') {
    throw new Error('Test 3 Failed! Decrypted file URL does not match original.');
  }
  console.log('✅ Test 3 Passed! (File path reference encrypted at rest with AES-256-GCM)');

  // 5. Test Admin Rejection with Mandatory Notes
  console.log('\n--- Test 4: Testing Admin Rejection Flow ---');
  try {
    await KycService.rejectRequest({
      requestId,
      reviewer_user_id: 1,
      reviewer_role: 'admin',
      review_notes: '',
      tenant_id: tenantId,
    });
    throw new Error('Test 4 Failed! Rejection without notes should have failed.');
  } catch (err) {
    if (!err.message?.includes('mandatory')) {
      throw err;
    }
    console.log('Rejection without notes correctly rejected by validator.');
  }

  const rejectRes = await KycService.rejectRequest({
    requestId,
    reviewer_user_id: 1,
    reviewer_role: 'admin',
    review_notes: 'Uploaded document image is blurry. Please re-submit.',
    tenant_id: tenantId,
  });

  console.log('Reject Result:', rejectRes);
  if (rejectRes.status !== 'rejected') {
    throw new Error('Test 4 Failed! Expected status rejected.');
  }
  console.log('✅ Test 4 Passed!');

  // 6. Submit second request & Approve it
  console.log('\n--- Test 5: Testing Admin Approval Flow ---');
  // Generate fresh OTP
  const otpRes2 = await RedemptionService.requestOtp({
    phone: oldPhone,
    customer_id: customerId,
    tenant_id: tenantId,
  });
  const otpCode2 = otpRes2.debug_otp || '123456';

  const submitRes2 = await KycService.submitChangeRequest({
    customer_id: customerId,
    change_type: 'phone_update',
    new_value: newPhone,
    reason: 'Resubmitting with clear Aadhaar copy',
    id_proof_type: 'Aadhaar',
    id_proof_file_url: '/uploads/kyc_proofs/clear_aadhaar.jpg',
    otp: otpCode2,
    requested_by: 1,
    tenant_id: tenantId,
  });

  const requestId2 = submitRes2.request.id;

  const approveRes = await KycService.approveRequest({
    requestId: requestId2,
    reviewer_user_id: 1,
    reviewer_role: 'admin',
    review_notes: 'Verified Aadhaar match and approved.',
    tenant_id: tenantId,
  });

  console.log('Approve Result:', approveRes);
  if (approveRes.status !== 'approved') {
    throw new Error('Test 5 Failed! Expected status approved.');
  }

  // Verify customer_phones IS updated now
  const updatedPhoneRes = await pool.query(
    `SELECT phone_number FROM customer_phones WHERE customer_id = $1 AND tenant_id = $2;`,
    [customerId, tenantId]
  );

  console.log('Updated Phone in DB:', updatedPhoneRes.rows[0].phone_number);
  if (updatedPhoneRes.rows[0].phone_number !== newPhone) {
    throw new Error(`Test 5 Failed! Expected updated phone ${newPhone}, got ${updatedPhoneRes.rows[0].phone_number}`);
  }

  // Verify Audit Log entry
  const auditRes = await pool.query(
    `SELECT action, entity_id FROM audit_log WHERE entity_id = $1 AND action = 'kyc_phone_update_approved' ORDER BY created_at DESC LIMIT 1;`,
    [customerId]
  );
  if (auditRes.rows.length === 0) {
    throw new Error('Test 5 Failed! No audit log entry found for kyc_phone_update_approved.');
  }

  console.log('✅ Test 5 Passed! (Phone number updated and audit log entry created)');

  // Restore original phone for customer cleanup
  await pool.query(
    `UPDATE customer_phones SET phone_number = $1 WHERE customer_id = $2 AND tenant_id = $3;`,
    [oldPhone, customerId, tenantId]
  );

  console.log('\n🎉 ALL PHASE 3 KYC VERIFICATION TESTS PASSED SUCCESSFULLY!');
  await pool.end();
}

testPhase3Kyc().catch((e) => {
  console.error('❌ Phase 3 Verification Test Failed:', e);
  process.exit(1);
});
