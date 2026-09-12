// scripts/verify-split-result.js
const SearchService = require('../src/services/search.service');
const CustomerService = require('../src/services/customer.service');
const { pool } = require('../src/config/db');

async function verify() {
  console.log('--- Verifying Search for NEETA ---');
  const neetaSearch = await SearchService.searchUnified('NEETA', 'bellad_and_company');
  console.log('NEETA Search Results:', neetaSearch);

  console.log('\n--- Verifying Search for Nagarathnamma ---');
  const nagSearch = await SearchService.searchUnified('Nagarathnamma', 'bellad_and_company');
  console.log('Nagarathnamma Search Results:', nagSearch);

  console.log('\n--- Verifying Search for VIN MYHABFCB7TBF06740 ---');
  const vinSearch = await SearchService.searchUnified('MYHABFCB7TBF06740', 'bellad_and_company');
  console.log('VIN MYHABFCB7TBF06740 Search Results:', vinSearch);

  await pool.end();
}

verify();
