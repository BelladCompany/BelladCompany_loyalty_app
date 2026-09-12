const CustomerService = require('../src/services/customer.service');
const { pool } = require('../src/config/db');

async function testGetCustomer() {
  try {
    console.log('🔍 Testing CustomerService.getCustomerById...');

    // Get a sample customer ID from DB
    const res = await pool.query('SELECT customer_id FROM customers LIMIT 1;');
    if (res.rows.length === 0) {
      console.log('No customers found in DB.');
      return;
    }

    const testCustId = res.rows[0].customer_id;
    console.log(`Fetching customer ID: ${testCustId}`);

    const startTime = performance.now();
    const custProfile = await CustomerService.getCustomerById(testCustId, 'bellad_and_company');
    const endTime = performance.now();

    console.log(`✅ Profile loaded successfully in ${(endTime - startTime).toFixed(2)} ms!`);
    console.log('Customer Details Sample:');
    console.log(JSON.stringify(custProfile, null, 2));

  } catch (err) {
    console.error('❌ Error fetching customer profile:', err);
  } finally {
    await pool.end();
  }
}

testGetCustomer();
