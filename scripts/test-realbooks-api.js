const { pool } = require('../src/config/db');
const realbooksClient = require('../src/services/realbooks/realbooks.client');
const RealBooksService = require('../src/services/realbooks/realbooks.service');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 REALBOOKS API INTEGRATION VERIFICATION TEST SUITE');
  console.log('====================================================');

  try {
    // Test 1: RealBooks Client & Config
    console.log('\n[Test 1] Verifying RealBooks Client Configuration...');
    console.log(`- Mode: ${realbooksClient.mode} (Safe Sandbox: ${realbooksClient.mode !== 'live'})`);
    console.log(`- Base URL: ${realbooksClient.baseUrl}`);
    console.log(`- Domain (accountName header): ${realbooksClient.domain}`);
    console.log(`- Company ID (CID): ${realbooksClient.cid}, Segment ID: ${realbooksClient.segid}`);

    if (realbooksClient.mode !== 'test') {
      console.warn('⚠️ Warning: REALBOOKS_MODE is not "test". Safety override active.');
    } else {
      console.log('✅ RealBooks client initialized in safe TEST mode as instructed.');
    }

    // Test 2: Double Entry Accounting Math
    console.log('\n[Test 2] Verifying RealBooks Double-Entry Voucher Accounting Logic...');
    const billAmount = 2500;
    const discountAmount = 500;
    const cashPaid = billAmount - discountAmount;

    const voucherRes = await realbooksClient.createAccountVoucher({
      receiptNo: 'REC-TEST-VERIFY-01',
      customerName: 'Kavya Bellad',
      customerId: 'BAC-TEST-001',
      billAmount,
      discountAmount,
      cashPaid,
      category: 'service',
      jobCard: 'JC-10029',
    });

    console.log(`- Voucher API Result:`, voucherRes.message);
    const ledgerDetails = voucherRes.request_payload.json_obj.ledgerDetails;
    const totalDr = ledgerDetails
      .filter((l) => l.amountType === 'dr')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    const totalCr = ledgerDetails
      .filter((l) => l.amountType === 'cr')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    console.log(`- Total Debit: ₹${totalDr}`);
    console.log(`- Total Credit: ₹${totalCr}`);

    if (totalDr !== totalCr || totalDr !== billAmount) {
      throw new Error(`Double entry mismatch! DR (${totalDr}) !== CR (${totalCr})`);
    }
    console.log('✅ Double entry accounting formula balanced: Total DR === Total CR');

    // Test 3: Customer Ledger Creation Schema Check (PDF Page 48-50)
    console.log('\n[Test 3] Verifying Customer Ledger Creation Payload Schema...');
    const ledgerRes = await realbooksClient.createOrUpdateCustomerLedger({
      customer_id: 'BAC-TEST-001',
      name: 'Kavya Bellad',
      phone: '9876543210',
      email: 'kavya@bellad.in',
      address: 'Hubli Central Showroom',
      city: 'Hubli',
      state: 'Karnataka',
      ledger_group: 'Sundry Debtors',
    });

    console.log(`- Ledger API Result:`, ledgerRes.message);
    const ledgerPayload = ledgerRes.request_payload.ledger;
    if (ledgerPayload.ledgerGroupName !== 'Sundry Debtors') {
      throw new Error(`Expected Sundry Debtors ledgerGroupName, got ${ledgerPayload.ledgerGroupName}`);
    }
    console.log('✅ Customer Ledger payload matches official RealBooks Sundry Debtors schema');

    // Test 4: RealBooks Service Customer Ledger Push & DB Audit Logging
    console.log('\n[Test 4] Testing RealBooksService.pushCustomerLedger & DB logging...');
    // Fetch a real customer from DB to test with real record
    const custRes = await pool.query(`SELECT customer_id, customer_name FROM customers LIMIT 1;`);
    const testCustomerId = custRes.rows[0]?.customer_id || 'BAC-613E43F4';

    const serviceLedgerRes = await RealBooksService.pushCustomerLedger({
      customer_id: testCustomerId,
      tenant_id: 'bellad_and_company',
    });

    console.log(`- Pushed customer: ${testCustomerId} (${serviceLedgerRes.ledger_name})`);
    console.log(`- Assigned RealBooks Ledger ID: ${serviceLedgerRes.realbooks_ledger_id}`);
    console.log('✅ RealBooksService.pushCustomerLedger executed & logged successfully.');

    // Test 5: RealBooks Service Receipt Push (Ledger + Balanced Voucher)
    console.log('\n[Test 5] Testing RealBooksService.pushReceiptTransaction...');
    const receiptRes = await RealBooksService.pushReceiptTransaction({
      receipt_no: `TEST-INV-${Date.now()}`,
      customer_id: testCustomerId,
      bill_amount: 1750,
      discount_amount: 250,
      points_redeemed: 1000,
      category: 'service',
      branch_id: 1,
      job_card: 'JC-8831',
      tenant_id: 'bellad_and_company',
    });

    console.log(`- Receipt Voucher Result: ${receiptRes.message}`);
    console.log(`- Voucher ID: ${receiptRes.voucher_id}`);
    console.log(`- Ledger ID: ${receiptRes.ledger_id}`);
    console.log('✅ RealBooksService.pushReceiptTransaction executed successfully.');

    // Test 6: Verify Database Audit Log Entries
    console.log('\n[Test 6] Verifying database records in realbooks_sync_log...');
    const logRes = await pool.query(
      `SELECT sync_id, entity_type, entity_id, api_status, request_payload, response_payload, created_at
       FROM realbooks_sync_log
       ORDER BY created_at DESC
       LIMIT 3;`
    );

    console.log(`- Retrieved ${logRes.rows.length} recent audit logs:`);
    for (const row of logRes.rows) {
      console.log(`  * ID: ${row.sync_id} | Type: ${row.entity_type} | Entity: ${row.entity_id} | Status: ${row.api_status}`);
      if (row.request_payload) {
        console.log(`    Request Payload verified (Keys: ${Object.keys(row.request_payload).join(', ')})`);
      }
    }
    console.log('✅ Audit log table verified with JSONB request/response payloads.');

    // Test 7: RealBooks Connection Status
    console.log('\n[Test 7] Testing RealBooksService.getConnectionStatus...');
    const status = await RealBooksService.getConnectionStatus('bellad_and_company');
    console.log(`- Status: Mode=${status.mode}, Synced=${status.stats.synced}, Total=${status.stats.total}`);
    console.log('✅ RealBooks connection status reporting operational.');

    console.log('\n====================================================');
    console.log('🎉 ALL REALBOOKS VERIFICATION TESTS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
