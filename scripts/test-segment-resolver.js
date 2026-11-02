const { pool } = require('../src/config/db');
const resolver = require('../src/services/realbooks/realbooks.segment_resolver');

async function testResolver() {
  console.log('====================================================');
  console.log('🧪 TESTING REALBOOKS DYNAMIC SEGMENT RESOLUTION');
  console.log('====================================================');

  const testCases = [
    {
      name: 'Hyundai Creta Service at Hubli',
      input: { model: 'Creta', branch_name: 'HYUNDAI HUBLI', category: 'service' },
      expectedSegid: '6482', // Hyundai Hubli WS_Demo
      expectedBrand: 'Hyundai',
    },
    {
      name: 'Hyundai Creta Sale at Dharwad',
      input: { model: 'New Creta', branch_name: 'HYUNDAI DHARWAD', category: 'sale' },
      expectedSegid: '6487', // Hyundai Dharwad SR_Demo
      expectedBrand: 'Hyundai',
    },
    {
      name: 'Hero HF Deluxe Showroom Sale at Hubli',
      input: { model: 'HF DELUXE', branch_name: 'Hero Hubli', category: 'sale' },
      expectedSegid: '6475', // Hero Hubli SR_Demo
      expectedBrand: 'Hero',
    },
    {
      name: 'Hero Splendor Service at Dharwad',
      input: { model: 'Splendor+', branch_name: 'Hero Dharwad', category: 'service' },
      expectedSegid: '6474', // Hero Dharwad WS_Demo
      expectedBrand: 'Hero',
    },
    {
      name: 'Swaraj 744 Tractor Service at Hubli',
      input: { model: '744', branch_name: 'SWARAJ HUBLI', category: 'service' },
      expectedSegid: '6491', // Swaraj Hubli WS_Demo
      expectedBrand: 'Swaraj',
    },
    {
      name: 'Swaraj 742 Tractor Sale at Hubli',
      input: { model: '742', branch_name: 'SWARAJ HUBLI', category: 'sale' },
      expectedSegid: '6490', // Swaraj Hubli SR_Demo
      expectedBrand: 'Swaraj',
    },
    {
      name: 'Customer ID Lookup (BAC-3953CD66 - Swaraj vehicle owner)',
      input: { customer_id: 'BAC-3953CD66', category: 'service' },
      expectedSegid: '6491', // Swaraj Hubli WS_Demo
      expectedBrand: 'Swaraj',
    },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const res = await resolver.resolveSegment(tc.input);
    const ok = res.segid === tc.expectedSegid && res.brand.toLowerCase() === tc.expectedBrand.toLowerCase();
    console.log(`\nTest: ${tc.name}`);
    console.log(`- Input:`, tc.input);
    console.log(`- Resolved: CID=${res.cid}, SEGID=${res.segid} (${res.segment_name}), Brand=${res.brand}, Source=${res.resolution_source}`);

    if (ok) {
      console.log(`✅ [PASS] Resolved correctly to SEGID ${res.segid}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Expected SEGID ${tc.expectedSegid} (${tc.expectedBrand}), got ${res.segid} (${res.brand})`);
    }
  }

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passed} / ${testCases.length} TESTS PASSED`);
  console.log(`====================================================`);

  await pool.end();
  if (passed !== testCases.length) process.exit(1);
}

testResolver().catch(console.error);

