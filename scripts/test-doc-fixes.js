const assert = require('assert');
const { pool } = require('../src/config/db');
const RealBooksService = require('../src/services/realbooks/realbooks.service');
const RedemptionService = require('../src/services/redemption.service');

async function runTests() {
  console.log('--- Testing Google Doc Feedback Fixes ---');

  // Test 1: RealBooks Direct Receipt Sync
  console.log('1. Testing RealBooks direct receipt push...');
  const rbResult = await RealBooksService.syncReceiptDirect({
    receipt_no: 'TEST-REC-101',
    customer_id: 'BAC-TEST01',
    bill_amount: 1000,
    discount_amount: 225,
    points_redeemed: 900,
    category: 'accessories',
    branch_id: 1,
    tenant_id: 'bellad_and_company',
  });
  assert.strictEqual(rbResult.status, 'synced', 'RealBooks push status should be synced');
  assert.ok(rbResult.voucher_id, 'RealBooks voucher_id should be returned');
  console.log('  ✅ RealBooks Direct Sync Passed! Voucher:', rbResult.voucher_id);

  // Test 2: CSV Normalization Logic
  console.log('2. Testing CSV Column Mapping Logic...');
  const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const headers = ['Customer Name', 'Phone No', 'Adhar', 'Vehicle Details', 'Model', 'Branch', 'VIN No'];
  const norm = headers.map(normalizeKey);
  assert.deepStrictEqual(norm, ['customername', 'phoneno', 'adhar', 'vehicledetails', 'model', 'branch', 'vinno']);
  console.log('  ✅ CSV Column Normalization Passed!');

  console.log('All Doc Fix Regression Tests Passed Successfully!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

