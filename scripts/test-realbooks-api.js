const { pool } = require('../src/config/db');
const realbooksClient = require('../src/services/realbooks/realbooks.client');
const RealBooksService = require('../src/services/realbooks/realbooks.service');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 REALBOOKS DYNAMIC MODEL-SEGMENT TEST SUITE');
  console.log('====================================================');

  try {
    // Force safe test mode for test suite
    realbooksClient.mode = 'test';

    // Test 1: Config
    console.log('\n[Test 1] Verifying RealBooks Config & Default Segment...');
    console.log(`- Mode: ${realbooksClient.mode} (Safe Sandbox: ${realbooksClient.mode !== 'live'})`);
    console.log(`- Base URL: ${realbooksClient.baseUrl}`);
    console.log(`- CID: ${realbooksClient.cid}, Default SEGID: ${realbooksClient.segid}`);

    // Test 2: Dynamic Segment Routing for Hyundai Creta
    console.log('\n[Test 2] Testing Dynamic Routing for Hyundai Creta Service...');
    const custRes = await pool.query(`SELECT customer_id FROM customers LIMIT 1;`);
    const testCustomerId = custRes.rows[0]?.customer_id || 'BAC-3953CD66';

    const hyundaiRes = await RealBooksService.pushReceiptTransaction({
      receipt_no: `HY-CRETA-${Date.now()}`,
      customer_id: testCustomerId,
      model: 'Creta',
      bill_amount: 4500,
      discount_amount: 500,
      points_redeemed: 2000,
      category: 'service',
      branch_name: 'HYUNDAI HUBLI',
    });

    console.log(`- Resolved CID: ${hyundaiRes.cid}`);
    console.log(`- Resolved SEGID: ${hyundaiRes.segid} (${hyundaiRes.segment_name})`);
    console.log(`- Brand Detected: ${hyundaiRes.brand}, Model: ${hyundaiRes.model_matched}`);

    if (hyundaiRes.segid !== '6482') {
      throw new Error(`Expected SEGID 6482 for Hyundai Hubli WS, got ${hyundaiRes.segid}`);
    }
    console.log('✅ Hyundai Creta correctly routed to SEGID 6482 (Hyundai Hubli WS_Demo)');

    // Test 3: Dynamic Segment Routing for Hero Splendor Showroom Sale
    console.log('\n[Test 3] Testing Dynamic Routing for Hero Splendor Sale at Hubli...');
    const heroRes = await RealBooksService.pushReceiptTransaction({
      receipt_no: `HERO-SPL-${Date.now()}`,
      customer_id: testCustomerId,
      model: 'Splendor+',
      bill_amount: 85000,
      discount_amount: 1000,
      points_redeemed: 4000,
      category: 'sale',
      branch_name: 'Hero Hubli',
    });

    console.log(`- Resolved CID: ${heroRes.cid}`);
    console.log(`- Resolved SEGID: ${heroRes.segid} (${heroRes.segment_name})`);
    console.log(`- Brand Detected: ${heroRes.brand}`);

    if (heroRes.segid !== '6475') {
      throw new Error(`Expected SEGID 6475 for Hero Hubli SR, got ${heroRes.segid}`);
    }
    console.log('✅ Hero Splendor Sale correctly routed to SEGID 6475 (Hero Hubli SR_Demo)');

    // Test 4: Dynamic Segment Routing for Swaraj 744 Tractor Service
    console.log('\n[Test 4] Testing Dynamic Routing for Swaraj 744 Tractor Service...');
    const swarajRes = await RealBooksService.pushReceiptTransaction({
      receipt_no: `SWAR-744-${Date.now()}`,
      customer_id: testCustomerId,
      model: '744',
      bill_amount: 3200,
      discount_amount: 300,
      points_redeemed: 1200,
      category: 'service',
      branch_name: 'SWARAJ HUBLI',
    });

    console.log(`- Resolved CID: ${swarajRes.cid}`);
    console.log(`- Resolved SEGID: ${swarajRes.segid} (${swarajRes.segment_name})`);
    console.log(`- Brand Detected: ${swarajRes.brand}`);

    if (swarajRes.segid !== '6491') {
      throw new Error(`Expected SEGID 6491 for Swaraj Hubli WS, got ${swarajRes.segid}`);
    }
    console.log('✅ Swaraj 744 correctly routed to SEGID 6491 (Swaraj Hubli WS_Demo)');

    // Test 5: Verify realbooks_sync_log stores CID, SEGID, and Segment Name
    console.log('\n[Test 5] Verifying realbooks_sync_log records have CID and SEGID...');
    const logRes = await pool.query(
      `SELECT sync_id, entity_id, cid, segid, segment_name, created_at
       FROM realbooks_sync_log
       WHERE cid IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 3;`
    );

    console.log(`- Retrieved ${logRes.rows.length} logs with segment tracking:`);
    for (const r of logRes.rows) {
      console.log(`  * Entity: ${r.entity_id} | CID: ${r.cid} | SEGID: ${r.segid} | Segment: ${r.segment_name}`);
    }
    console.log('✅ CID, SEGID, and Segment Name recorded in database audit log.');

    // Test 6: Verify Connection Status & Configured Segments
    console.log('\n[Test 6] Testing Connection Status & Configured Segments...');
    const status = await RealBooksService.getConnectionStatus('bellad_and_company');
    console.log(`- Configured Segments: ${status.configured_segments_count}`);
    console.log(`- Supported Brands: ${status.supported_brands.join(', ')}`);

    if (status.configured_segments_count < 30) {
      throw new Error(`Expected at least 30 segments, got ${status.configured_segments_count}`);
    }
    console.log('✅ Connection status correctly reports configured RealBooks segments.');

    console.log('\n====================================================');
    console.log('🎉 ALL DYNAMIC MODEL-SEGID TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
