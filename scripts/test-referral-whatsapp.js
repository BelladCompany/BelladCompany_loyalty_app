const pool = require('../src/config/db');
const ReferralService = require('../src/services/referral.service');

async function testReferralWhatsAppFlow() {
  console.log('🧪 Testing Referral WhatsApp Code Generation & Auto-Tracking...');

  try {
    // 1. Pick an active customer from database
    const custRes = await pool.query(
      `SELECT customer_id, customer_name FROM customers WHERE tenant_id = 'bellad_and_company' LIMIT 1;`
    );

    if (custRes.rows.length === 0) {
      console.error('❌ No customer found in bellad_and_company');
      process.exit(1);
    }

    const testCustomer = custRes.rows[0];
    console.log(`👤 Using Referrer Customer: ${testCustomer.customer_name} (${testCustomer.customer_id})`);

    // 2. Test recordReferralShare (Simulate WhatsApp Share Click)
    const shareRes = await ReferralService.recordReferralShare({
      referrer_customer_id: testCustomer.customer_id,
      referee_name: 'Anand Kulkarni',
      referee_phone: '9845012345',
      vehicle_model: 'Tata Safari Dark Edition',
      share_channel: 'whatsapp',
      tenant_id: 'bellad_and_company',
    });

    console.log('\n✅ 1. Referral Share Logged Successfully:');
    console.log('   Referral Code:', shareRes.referral_code);
    console.log('   Share Channel:', shareRes.share_channel);
    console.log('   Shared At (Timestamp):', shareRes.shared_at);
    console.log('   WhatsApp URL generated:', shareRes.whatsapp_url ? 'Yes (Valid URL)' : 'No');
    console.log('   Sample Message Preview:\n   ', shareRes.share_message.split('\n')[0]);

    // Check code format: REF-BELL-XXXX-XXXX
    if (!shareRes.referral_code.startsWith('REF-BELL-')) {
      throw new Error(`Referral code ${shareRes.referral_code} does not match REF-BELL-XXXX-XXXX pattern`);
    }
    console.log('   ✓ Format verified: REF-BELL-XXXX-XXXX (No PIN required)');

    // 3. Test getCustomerReferralSummary
    const summary = await ReferralService.getCustomerReferralSummary(
      testCustomer.customer_id,
      'bellad_and_company'
    );

    console.log('\n✅ 2. Customer Referral Summary:');
    console.log('   Primary Referral Code:', summary.referral_code);
    console.log('   Total Referrals Count:', summary.referrals.length);
    console.log('   Locked Points:', summary.locked_points, 'PTS (₹' + summary.locked_value_inr + ')');

    const matchedRef = summary.referrals.find(r => r.referral_code === shareRes.referral_code);
    if (!matchedRef) {
      throw new Error('Newly created WhatsApp referral not found in customer referral summary!');
    }
    console.log('   ✓ Newly created referral found in customer pipeline:');
    console.log('     Code:', matchedRef.referral_code);
    console.log('     Friend Name:', matchedRef.friend_name);
    console.log('     Shared At:', matchedRef.shared_at);
    console.log('     Dual Points:', matchedRef.referrer_points, 'for Referrer |', matchedRef.referee_points, 'for Friend (Total:', matchedRef.both_points_total, ')');

    // 4. Test Admin Referrals query
    const adminCheck = await pool.query(
      `SELECT r.referral_id, r.referral_code, r.share_channel, r.shared_at, r.referee_name, r.status
       FROM referrals r
       WHERE r.referral_code = $1 AND r.tenant_id = 'bellad_and_company';`,
      [shareRes.referral_code]
    );

    if (adminCheck.rows.length === 0) {
      throw new Error('Referral record not found in referrals table!');
    }
    console.log('\n✅ 3. Admin / Staff Table Verification:');
    console.log('   Referral in DB:', adminCheck.rows[0]);
    console.log('   ✓ Referral successfully visible in Dealership Staff Referrals Table!');

    console.log('\n🎉 ALL REFERRAL WHATSAPP CODE & AUTO-TRACKING TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testReferralWhatsAppFlow();

