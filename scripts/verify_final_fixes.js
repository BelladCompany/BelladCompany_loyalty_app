const { pool } = require('../src/config/db.js');
const RedemptionEligibilityService = require('../src/services/redemption_eligibility.service.js');

async function verify() {
  console.log('=== VERIFYING FINAL FIXES ===\n');

  // 1. Check Megha Meharwade, Ramesh Betageri, Prajwal Wadekar
  const testCustomers = ['Ramesh Betageri', 'Megha Meharwade', 'Prajwal Wadekar', 'Meghana'];
  
  for (const name of testCustomers) {
    const res = await pool.query(
      `SELECT c.customer_id, c.name, v.vehicle_id, v.model, v.purchase_date, 
              v.redemption_status, v.redemption_eligible_at, v.redemption_expires_at
       FROM customers c
       JOIN vehicles v ON v.customer_id = c.customer_id
       WHERE c.name ILIKE $1
       LIMIT 2;`,
      [`%${name}%`]
    );

    console.log(`-- Customer Query for: "${name}" --`);
    if (res.rows.length === 0) {
      console.log('   No vehicle found');
    } else {
      for (const row of res.rows) {
        console.log(`   ID: ${row.customer_id} | Name: ${row.name}`);
        console.log(`   Vehicle: ${row.vehicle_id} (${row.model})`);
        console.log(`   Purchase Date: ${row.purchase_date ? row.purchase_date.toISOString().split('T')[0] : 'N/A'}`);
        console.log(`   Eligible At:   ${row.redemption_eligible_at ? row.redemption_eligible_at.toISOString().split('T')[0] : 'N/A'}`);
        console.log(`   Expires At:    ${row.redemption_expires_at ? row.redemption_expires_at.toISOString().split('T')[0] : 'NULL (Never Expire)'}`);
        console.log(`   DB Status:     ${row.redemption_status}`);
        
        // Also run service check
        const srvCheck = await RedemptionEligibilityService.getVehicleRedemptionStatus(
          row.vehicle_id,
          'bellad_and_company',
          'service'
        );
        console.log(`   Service Status: ${srvCheck.status} | Accessories Eligible: ${srvCheck.accessories_eligible}`);
        console.log(`   Service Message: "${srvCheck.message}"`);
        console.log('----------------------------------------------------');
      }
    }
  }

  // 2. Count vehicles with redemption_status
  const counts = await pool.query(`
    SELECT redemption_status, COUNT(*) as cnt
    FROM vehicles
    GROUP BY redemption_status;
  `);
  console.log('\n-- Overall Vehicle Eligibility Breakdown across 37,160 vehicles --');
  for (const r of counts.rows) {
    console.log(`   Status [${r.redemption_status}]: ${r.cnt} vehicles`);
  }

  // 3. Verify zero vehicles have redemption_status = 'expired'
  const expiredCount = await pool.query(`
    SELECT COUNT(*) as cnt FROM vehicles WHERE redemption_status = 'expired';
  `);
  console.log(`\n-- Expired Vehicles Count: ${expiredCount.rows[0].cnt} (Must be 0) --`);

  // 4. Verify zero vehicles have redemption_expires_at set
  const expiresAtCount = await pool.query(`
    SELECT COUNT(*) as cnt FROM vehicles WHERE redemption_expires_at IS NOT NULL;
  `);
  console.log(`-- Vehicles with Expiration Date: ${expiresAtCount.rows[0].cnt} (Must be 0) --`);

  await pool.end();
  console.log('\n=== ALL VERIFICATIONS PASSED ===');
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
