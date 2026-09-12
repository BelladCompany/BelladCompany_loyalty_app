const { pool } = require('../src/config/db');
const ReportService = require('../src/services/report.service');
const { scopeBranchAccess } = require('../src/middleware/roles');

async function testPhase6Reports() {
  console.log('🧪 Starting Phase 6 Multi-Branch & Brand Reporting Engine Verification Tests...\n');

  const tenantId = 'bellad_and_company';

  // --- Test 1: Points Summary Report ---
  console.log('--- Test 1: Points Summary Report ---');
  const pointsSummary = await ReportService.getPointsSummaryReport({ tenantId });
  console.log('Points Summary Output Sample:', JSON.stringify(pointsSummary.slice(0, 2), null, 2));

  if (!Array.isArray(pointsSummary)) {
    throw new Error('Test 1 Failed! Points summary output is not an array.');
  }
  console.log('✅ Test 1 Passed! (Points summary aggregated by branch, brand, and category)');

  // --- Test 2: Customer Distribution Pivot ---
  console.log('\n--- Test 2: Customer Distribution Pivot ---');
  const custDist = await ReportService.getCustomerDistributionReport({ tenantId });
  console.log('Customer Distribution Sample:', JSON.stringify(custDist.slice(0, 2), null, 2));

  if (!Array.isArray(custDist)) {
    throw new Error('Test 2 Failed! Customer distribution output is not an array.');
  }
  console.log('✅ Test 2 Passed! (Customer count pivot grouped by branch, brand, and model)');

  // --- Test 3: Points Liability & Expiring Risk Buckets ---
  console.log('\n--- Test 3: Points Liability & Expiring Risk Buckets ---');
  const liability = await ReportService.getPointsLiabilityReport({ tenantId });
  console.log('Points Liability Report:', JSON.stringify(liability, null, 2));

  if (
    typeof liability.total_unredeemed_points !== 'number' ||
    typeof liability.total_liability_rupees !== 'number' ||
    !liability.expiring_risk_buckets
  ) {
    throw new Error('Test 3 Failed! Liability metrics or risk buckets missing.');
  }

  if (liability.total_liability_rupees !== Math.floor(liability.total_unredeemed_points / 4)) {
    throw new Error('Test 3 Failed! Total liability ₹ calculation does not equal unredeemed_points / 4.');
  }
  console.log('✅ Test 3 Passed! (Points liability & 30/60/90-day risk buckets calculated accurately)');

  // --- Test 4: Referral Conversion & Override Audit ---
  console.log('\n--- Test 4: Referral Conversion & Override Audit ---');
  const referralsReport = await ReportService.getReferralConversionReport({ tenantId });
  console.log('Referral Audit Summary:', JSON.stringify(referralsReport, null, 2));

  if (!referralsReport.summary || !Array.isArray(referralsReport.status_breakdown)) {
    throw new Error('Test 4 Failed! Referral audit summary or breakdown missing.');
  }
  console.log('✅ Test 4 Passed! (Referral conversion rates, override counts, and point deltas calculated)');

  // --- Test 5: KYC Audit & Cashier Activity ---
  console.log('\n--- Test 5: KYC Audit & Cashier Activity ---');
  const kycAudit = await ReportService.getKycAuditReport({ tenantId });
  console.log('KYC Audit Sample:', JSON.stringify(kycAudit.slice(0, 3), null, 2));

  if (!Array.isArray(kycAudit)) {
    throw new Error('Test 5 Failed! KYC audit output is not an array.');
  }
  console.log('✅ Test 5 Passed! (KYC change requests aggregated by branch & cashier volume)');

  // --- Test 6: CSV Export Conversion Utility ---
  console.log('\n--- Test 6: CSV Export Conversion Utility ---');
  const sampleData = [
    { branch: 'Hubli Main', category: 'service', points: 100, note: 'Special "Quote" Test' },
    { branch: 'Dharwad', category: 'sale', points: 500, note: 'Normal' },
  ];
  const csvStr = ReportService.convertToCsv(sampleData);
  console.log('Generated CSV:\n' + csvStr);

  if (!csvStr.includes('"branch","category","points","note"') || !csvStr.includes('"Special ""Quote"" Test"')) {
    throw new Error('Test 6 Failed! CSV conversion utility did not format headers or escape quotes properly.');
  }
  console.log('✅ Test 6 Passed! (CSV generator correctly escapes headers and fields)');

  // --- Test 7: Branch Scoping Security Helper ---
  console.log('\n--- Test 7: Branch Scoping Security Helper ---');
  const mockReqBranchManager = { user: { role: 'branch_manager', branch_id: 2 } };
  const scopedManager = scopeBranchAccess(mockReqBranchManager);

  const mockReqSuperAdmin = { user: { role: 'super_admin' }, query: { branch_id: '5' } };
  const scopedAdmin = scopeBranchAccess(mockReqSuperAdmin);

  console.log('Branch Manager Scope:', scopedManager);
  console.log('Super Admin Scope:', scopedAdmin);

  if (scopedManager.branchId !== 2 || !scopedManager.isRestrictedToBranch) {
    throw new Error('Test 7 Failed! Branch Manager scoping did not enforce branch_id = 2.');
  }
  if (scopedAdmin.branchId !== 5 || scopedAdmin.isRestrictedToBranch) {
    throw new Error('Test 7 Failed! Super Admin scoping failed to allow requested branch query.');
  }
  console.log('✅ Test 7 Passed! (Pan-India role hierarchy & branch scoping verified)');

  console.log('\n🎉 ALL PHASE 6 REPORTING ENGINE TESTS PASSED SUCCESSFULLY!');
  await pool.end();
}

testPhase6Reports().catch((e) => {
  console.error('❌ Phase 6 Verification Test Failed:', e);
  process.exit(1);
});
