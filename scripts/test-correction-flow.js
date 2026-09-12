require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { pool } = require('../src/config/db');
const bcrypt = require('bcryptjs');
const RedemptionService = require('../src/services/redemption.service');
const CorrectionService = require('../src/services/correction.service');

async function testCorrectionFlow() {
  console.log('🧪 Starting End-to-End Ticket-Based Transaction Correction Test...');
  const tenantId = process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
  const client = await pool.connect();

  try {
    const customerId = 'BAC-CORR-TEST1';
    const phone = '9777711111';
    const receiptNo = 'REC-CORR-WRONG-9001';

    console.log('\n--- Setup Test Customer & Opening Points ---');
    // Disable points_ledger trigger for test setup
    await client.query(`ALTER TABLE points_ledger DISABLE TRIGGER USER;`);
    await client.query(`DELETE FROM points_ledger WHERE customer_id = $1;`, [customerId]);
    await client.query(`DELETE FROM redemptions WHERE customer_id = $1;`, [customerId]);
    await client.query(`DELETE FROM correction_requests WHERE customer_id = $1;`, [customerId]);
    await client.query(`DELETE FROM otp_requests WHERE customer_id = $1;`, [customerId]);
    await client.query(`DELETE FROM customer_phones WHERE customer_id = $1;`, [customerId]);
    await client.query(`DELETE FROM customers WHERE customer_id = $1;`, [customerId]);
    await client.query(`ALTER TABLE points_ledger ENABLE TRIGGER USER;`);

    // Insert customer with 1000 initial points
    await client.query(`
      INSERT INTO customers (customer_id, customer_name, tenant_id)
      VALUES ($1, 'Correction Test Customer', $2);
    `, [customerId, tenantId]);

    await client.query(`
      INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
      VALUES ($1, $2, TRUE, $3);
    `, [customerId, phone, tenantId]);

    // Give customer 1,000 opening points in points_ledger
    await client.query(`
      INSERT INTO points_ledger (customer_id, branch_id, type, transaction_category, points, source_ref, tenant_id)
      VALUES ($1, 1, 'earn_sale', 'sale', 1000, 'Opening Test Points', $2);
    `, [customerId, tenantId]);

    console.log('✅ Setup complete: Customer created with 1,000 opening points.');

    // ── STEP 1: Perform Redemption with WRONG Bill Amount (₹5,000 instead of ₹1,200) ──
    console.log('\n--- Step 1: Perform Redemption with WRONG Bill Amount (₹5,000) ---');
    const otpCode = '654321';
    const otpHash = await bcrypt.hash(otpCode, 8);
    await client.query(`
      INSERT INTO otp_requests (customer_id, otp_hash, purpose, expires_at, tenant_id)
      VALUES ($1, $2, 'redemption', NOW() + INTERVAL '10 minutes', $3);
    `, [customerId, otpHash, tenantId]);

    const wrongRedemption = await RedemptionService.redeemPoints({
      phone,
      customer_id: customerId,
      otp: otpCode,
      bill_amount: 5000, // WRONG bill amount!
      category: 'service',
      receipt_no: receiptNo,
      account_ledger_no: 'ACC-CORR-WRONG',
      tenant_id: tenantId,
    });

    console.log('⚠️ Wrong redemption processed:', {
      discount_applied: wrongRedemption.discount_applied,
      points_redeemed: wrongRedemption.points_redeemed,
      cash_paid: wrongRedemption.cash_paid,
      new_points_earned: wrongRedemption.new_points_earned,
      wrong_balance: wrongRedemption.updated_total_balance,
    });

    // ── STEP 2: Preview Correction Math ──
    console.log('\n--- Step 2: Preview Correction Math (Correct Bill: ₹1,200) ---');
    const preview = await CorrectionService.previewCorrection({
      points_ledger_reference: receiptNo,
      correct_bill_amount: 1200,
      tenant_id: tenantId,
    });

    console.log('📊 Computed Preview Math:', {
      balance_before_wrong_tx: preview.calculation_breakup.balance_before_transaction,
      original_net_points: preview.calculation_breakup.original_net_points,
      corrected_discount: preview.calculation_breakup.discount_applied,
      corrected_points_redeemed: preview.calculation_breakup.points_redeemed,
      corrected_cash_paid: preview.calculation_breakup.cash_paid,
      corrected_new_earned: preview.calculation_breakup.new_points_earned,
      expected_final_balance: preview.calculation_breakup.expected_final_balance,
    });

    if (preview.calculation_breakup.expected_final_balance !== 38) {
      throw new Error(`Expected preview final balance 38, got ${preview.calculation_breakup.expected_final_balance}`);
    }

    // ── STEP 3: Cashier Raises Correction Request Ticket ──
    console.log('\n--- Step 3: Cashier Raises Correction Request ---');
    // Ensure proof directory and dummy screenshot exist
    const proofDir = path.join(__dirname, '../uploads/correction_proofs');
    if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });
    const dummyProofPath = path.join(proofDir, 'test_proof_corr.jpg');
    fs.writeFileSync(dummyProofPath, 'DUMMY_IMAGE_DATA');

    const raiseResult = await CorrectionService.raiseCorrectionRequest({
      customer_id: customerId,
      points_ledger_reference: receiptNo,
      wrong_bill_amount: 5000,
      correct_bill_amount: 1200,
      explanation: 'Cashier mistakenly typed 5000 rupees bill amount instead of actual 1200 rupees on receipt REC-CORR-WRONG-9001.',
      screenshot_file_url: '/uploads/correction_proofs/test_proof_corr.jpg',
      cashier_user_id: 1,
      branch_id: 1,
      tenant_id: tenantId,
    });

    const ticketId = raiseResult.request.id;
    console.log(`✅ Correction ticket #${ticketId} created cleanly in pending status.`);

    // ── STEP 4: Authenticated Proof Route Access Verification ──
    console.log('\n--- Step 4: Verify Authenticated Proof Route Access ---');
    const isAccessValid = await CorrectionService.verifyProofFileAccess('test_proof_corr.jpg', tenantId);
    console.log(`✅ Proof file authorization check: ${isAccessValid}`);
    if (!isAccessValid) throw new Error('Proof file authorization failed');

    // ── STEP 5: Admin Approves Correction Request ──
    console.log('\n--- Step 5: Admin Approves Correction Request ---');
    const approveResult = await CorrectionService.approveCorrectionRequest({
      request_id: ticketId,
      reviewer_user_id: 1,
      reviewer_role: 'admin',
      review_notes: 'Approved after verifying physical bill copy',
      tenant_id: tenantId,
    });

    console.log('🎉 Approval completed:', {
      status: approveResult.request.status,
      final_balance: approveResult.final_balance,
      reversals_inserted: approveResult.reversals.length,
      corrected_inserted: approveResult.corrected.length,
    });

    // ── STEP 6: Assertions & Integrity Checks ──
    console.log('\n--- Step 6: Verify Final Balance & Append-Only Audit Integrity ---');

    // 1. Check final balance
    const balRes = await client.query(
      `SELECT COALESCE(SUM(points), 0) AS total_balance FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );
    const actualFinalBalance = parseInt(balRes.rows[0].total_balance, 10);
    console.log(`🎯 Actual Final Customer Balance: ${actualFinalBalance} PTS (Expected: 38 PTS)`);

    if (actualFinalBalance !== 38) {
      throw new Error(`Final balance mismatch! Expected 38 PTS, got ${actualFinalBalance} PTS`);
    }

    // 2. Confirm all four sets of entries remain intact in DB (nothing deleted!)
    const allLedgerRows = await client.query(
      `SELECT entry_id, type, transaction_category, points, source_ref, receipt_no
       FROM points_ledger
       WHERE customer_id = $1 AND tenant_id = $2
       ORDER BY entry_id ASC;`,
      [customerId, tenantId]
    );

    console.log('\n📜 All Ledger Entries Intact in DB (Append-Only):');
    allLedgerRows.rows.forEach((r) => {
      console.log(`   [ID #${r.entry_id}] type=${r.type.padEnd(20)} category=${(r.transaction_category || '').padEnd(10)} points=${String(r.points).padStart(6)} ref=${r.source_ref}`);
    });

    const hasOriginal = allLedgerRows.rows.some((r) => r.type === 'redeem');
    const hasReversal = allLedgerRows.rows.some((r) => r.type === 'correction_reversal');
    const hasApplied = allLedgerRows.rows.some((r) => r.type === 'correction_applied');

    if (!hasOriginal || !hasReversal || !hasApplied) {
      throw new Error('Missing ledger entry types in database!');
    }

    // 3. Confirm audit_log entry
    const auditRes = await client.query(
      `SELECT * FROM audit_log WHERE action = 'points_correction_approved' AND entity_id = $1 AND tenant_id = $2;`,
      [ticketId.toString(), tenantId]
    );

    console.log(`✅ Audit Log entry recorded: ${auditRes.rows.length} row(s).`);
    if (auditRes.rows.length === 0) {
      throw new Error('Audit log entry for points_correction_approved was not recorded!');
    }

    console.log('\n✨ ALL CORRECTION FLOW TESTS & AUDIT INTEGRITY CHECKS PASSED SUCCESSFULLY! ✨\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    // Clean test data
    await client.query(`ALTER TABLE points_ledger DISABLE TRIGGER USER;`);
    await client.query(`DELETE FROM points_ledger WHERE customer_id = 'BAC-CORR-TEST1';`);
    await client.query(`DELETE FROM redemptions WHERE customer_id = 'BAC-CORR-TEST1';`);
    await client.query(`DELETE FROM correction_requests WHERE customer_id = 'BAC-CORR-TEST1';`);
    await client.query(`DELETE FROM otp_requests WHERE customer_id = 'BAC-CORR-TEST1';`);
    await client.query(`DELETE FROM customer_phones WHERE customer_id = 'BAC-CORR-TEST1';`);
    await client.query(`DELETE FROM customers WHERE customer_id = 'BAC-CORR-TEST1';`);
    await client.query(`ALTER TABLE points_ledger ENABLE TRIGGER USER;`);
    client.release();
    await pool.end();
  }
}

testCorrectionFlow();
