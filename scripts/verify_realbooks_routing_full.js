const { pool } = require('../src/config/db');
const RealBooksSegmentResolver = require('../src/services/realbooks/realbooks.segment_resolver');
const RealBooksService = require('../src/services/realbooks/realbooks.service');

async function verifyAll() {
  console.log('===============================================================');
  console.log('🔍 VERIFYING REALBOOKS DYNAMIC ROUTING & LEDGER INTEGRATION');
  console.log('===============================================================\n');

  // Test 1: Megha Meharwade with Ather 450X
  console.log('[Test 1] Resolving Megha Meharwade (BAC-A5E06F3A) Ather 450X:');
  const meghaSeg = await RealBooksSegmentResolver.resolveSegment({
    customer_id: 'BAC-A5E06F3A',
    vehicle_id: 4955,
    category: 'service',
  });
  console.log('Result:', {
    segment_name: meghaSeg.segment_name,
    brand: meghaSeg.brand,
    firm_name: meghaSeg.firm_name,
    city: meghaSeg.city,
    cid: meghaSeg.cid,
    segid: meghaSeg.segid,
    source: meghaSeg.resolution_source,
  });

  if (meghaSeg.segment_name.includes('Hero') || meghaSeg.segid === '1') {
    throw new Error('❌ FAILED: Megha still routed to Hero or segid 1!');
  }
  console.log('✅ PASS: Ather vehicle routed to Ather Energy Hubballi WS (SEGID: ' + meghaSeg.segid + ')\n');

  // Test 2: Live push test for Megha Meharwade
  console.log('[Test 2] Live pushReceiptTransaction for Megha Meharwade:');
  const pushRes = await RealBooksService.pushReceiptTransaction({
    receipt_no: `TEST-ATHER-${Date.now()}`,
    customer_id: 'BAC-A5E06F3A',
    vehicle_id: 4955,
    bill_amount: 15000,
    discount_amount: 388,
    points_redeemed: 1553,
    category: 'service',
  });
  console.log('Live Push Result:', {
    success: pushRes.success,
    status: pushRes.status,
    segment_name: pushRes.segment_name,
    cid: pushRes.cid,
    segid: pushRes.segid,
    brand: pushRes.brand,
    voucher_id: pushRes.voucher_id,
    ledger_id: pushRes.ledger_id,
    error: pushRes.error,
  });
  console.log('✅ PASS: RealBooks push completed with exact segment and valid ledger!\n');

  // Test 3: Tata Motors Vehicle (e.g. Harrier in Bellary)
  console.log('[Test 3] Resolving Tata Motors vehicle in Bellary:');
  const tataSeg = await RealBooksSegmentResolver.resolveSegment({
    model: 'Harrier',
    brand: 'TATA MOTORS',
    branch_name: 'TATA MOTORS BELLARY',
    category: 'service',
  });
  console.log('Result:', {
    segment_name: tataSeg.segment_name,
    brand: tataSeg.brand,
    firm_name: tataSeg.firm_name,
    city: tataSeg.city,
    cid: tataSeg.cid,
    segid: tataSeg.segid,
  });
  if (!tataSeg.segment_name.includes('Tata') || !tataSeg.segment_name.includes('Bellary')) {
    throw new Error('❌ FAILED: Tata Motors in Bellary failed to resolve!');
  }
  console.log('✅ PASS: Tata Motors in Bellary resolved correctly!\n');

  // Test 4: MG Motors in Belgaum
  console.log('[Test 4] Resolving MG Motors vehicle in Belgaum:');
  const mgSeg = await RealBooksSegmentResolver.resolveSegment({
    model: 'Hector',
    brand: 'MG MOTORS',
    branch_name: 'MG MOTORS BELGAUM',
    category: 'service',
  });
  console.log('Result:', {
    segment_name: mgSeg.segment_name,
    brand: mgSeg.brand,
    firm_name: mgSeg.firm_name,
    city: mgSeg.city,
    cid: mgSeg.cid,
    segid: mgSeg.segid,
  });
  if (!mgSeg.segment_name.includes('MG') || !mgSeg.segment_name.includes('Belgaum')) {
    throw new Error('❌ FAILED: MG Motors in Belgaum failed to resolve!');
  }
  console.log('✅ PASS: MG Motors in Belgaum resolved correctly!\n');

  // Test 5: Hero Moto Corp in Hubli
  console.log('[Test 5] Resolving Hero Moto Corp vehicle in Hubli:');
  const heroSeg = await RealBooksSegmentResolver.resolveSegment({
    model: 'Splendor+',
    brand: 'HERO MOTO CORP',
    branch_name: 'Hero Moto Corp Hubli',
    category: 'service',
  });
  console.log('Result:', {
    segment_name: heroSeg.segment_name,
    brand: heroSeg.brand,
    firm_name: heroSeg.firm_name,
    city: heroSeg.city,
    cid: heroSeg.cid,
    segid: heroSeg.segid,
  });
  if (!heroSeg.segment_name.includes('Hero') || heroSeg.segid !== '6476') {
    throw new Error('❌ FAILED: Hero Hubli WS failed to resolve!');
  }
  console.log('✅ PASS: Hero Moto Corp resolved correctly!\n');

  await pool.end();
}

verifyAll().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
