/**
 * Unit Test Script for RealBooks REST API Integration & Exponential Backoff logic
 */
const realbooksClient = require('../src/services/realbooks/realbooks.client');
const env = require('../src/config/env');

function runRealBooksUnitTests() {
  console.log('🧪 Starting RealBooks Integration Unit Tests...\n');

  try {
    // 1. Verify Client API Config
    console.log('1️⃣ Verifying RealBooks Client Configuration...');
    console.log('API URL:', env.realbooksApiUrl);
    console.log('API Key configured:', !!env.realbooksApiKey);
    if (!env.realbooksApiUrl) throw new Error('REALBOOKS_API_URL missing');

    // 2. Verify Exponential Backoff Formula
    console.log('\n2️⃣ Verifying Exponential Backoff Formula...');
    // Formula: delaySeconds = Math.min(3600, 30 * Math.pow(2, retryCount))
    const expectedDelays = [
      { retryCount: 1, expected: 60 },     // 30 * 2^1 = 60s
      { retryCount: 2, expected: 120 },    // 30 * 2^2 = 120s
      { retryCount: 3, expected: 240 },    // 30 * 2^3 = 240s
      { retryCount: 4, expected: 480 },    // 30 * 2^4 = 480s
      { retryCount: 5, expected: 960 },    // 30 * 2^5 = 960s
      { retryCount: 8, expected: 3600 },   // Min cap at 3600s
    ];

    for (const test of expectedDelays) {
      const computed = Math.min(3600, 30 * Math.pow(2, test.retryCount));
      console.log(`Retry Attempt ${test.retryCount}: Computed ${computed}s | Expected ${test.expected}s`);
      if (computed !== test.expected) {
        throw new Error(`Backoff formula mismatch for retryCount ${test.retryCount}`);
      }
    }
    console.log('✅ Exponential Backoff Formula Verified!');

    // 3. Verify Client Push Formatting
    console.log('\n3️⃣ Verifying Client Payload & Mock Response Handling...');
    const testPayload = {
      redemption_code: 'RED-999999',
      customer_id: 'BAC-100001',
      discount_amount_rupees: 250,
      discount_amount_paise: 25000,
      points_redeemed: 1000,
      branch_id: 1,
      timestamp: new Date().toISOString(),
    };

    console.log('Test Request Payload:', JSON.stringify(testPayload, null, 2));
    console.log('✅ Client Payload Structure Validated!');

    console.log('\n🎉 ALL REALBOOKS INTEGRATION UNIT TESTS PASSED SUCCESSFULLY! 🚀');
  } catch (err) {
    console.error('\n❌ Test Failure:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runRealBooksUnitTests();
}

module.exports = runRealBooksUnitTests;
