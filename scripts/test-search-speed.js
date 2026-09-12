const SearchService = require('../src/services/search.service');
const { pool } = require('../src/config/db');

async function testSearchSpeed() {
  try {
    console.log('⚡ Benchmarking PostgreSQL Search & Aadhaar Lookup...\n');

    // Get a sample Aadhaar number from DB
    const aRes = await pool.query("SELECT aadhaar_number FROM customers WHERE aadhaar_number IS NOT NULL LIMIT 1;");
    const sampleAadhaar = aRes.rows[0]?.aadhaar_number || '809990585824';

    const queries = [sampleAadhaar, sampleAadhaar.slice(0, 6), 'Ramesh', 'Kumar', 'Hero', 'BAC'];

    for (const q of queries) {
      const startTime = performance.now();
      const results = await SearchService.searchUnified(q);
      const endTime = performance.now();

      const durationMs = (endTime - startTime).toFixed(2);
      console.log(`🔍 Query: "${q}" | Results Found: ${results.length} | Time Taken: ${durationMs} ms`);

      if (results.length > 0) {
        const sample = results[0];
        console.log(`   Sample Result: Name="${sample.name}", Aadhaar="${sample.aadhaar_number}", Phone="${sample.phones[0]?.phone_number || 'N/A'}", Brand="${sample.vehicles[0]?.brand}", Model="${sample.vehicles[0]?.model}", FuelType="${sample.vehicles[0]?.fuel_type}", ExShowroom="₹${sample.vehicles[0]?.ex_showroom_price}", Points=${sample.points_balance}`);
      }
      console.log('-------------------------------------------------------------------------------');
    }

  } catch (err) {
    console.error('❌ Search benchmark error:', err);
  } finally {
    await pool.end();
  }
}

testSearchSpeed();
