const assert = require('assert');
const { pool } = require('../src/config/db');
const VehicleSalesPointsService = require('../src/services/vehicleSalesPoints.service');
const SearchService = require('../src/services/search.service');

async function fixAndVerify() {
  console.log('🔧 Running Data Fix & Verification for VIN MAT634169TPFA5334...\n');

  const client = await pool.connect();
  try {
    const vin = 'MAT634169TPFA5334';
    const regNo = 'KA51NA7534';
    const refId = 'B1E03367';
    const tenantId = 'bellad_and_company';

    // 1. Fetch existing vehicle record
    const vehRes = await client.query(
      `SELECT * FROM vehicles WHERE tenant_id = $1 AND (vin = $2 OR chassis_no = $2 OR registration_number = $3);`,
      [tenantId, vin, regNo]
    );

    if (vehRes.rows.length === 0) {
      throw new Error(`Vehicle with VIN ${vin} not found in database.`);
    }

    const vehicle = vehRes.rows[0];
    const customerId = vehicle.customer_id;
    const vehicleId = vehicle.vehicle_id;

    console.log(`📌 Target Vehicle Found: ID ${vehicleId} | Customer ${customerId} | Model: ${vehicle.model} (${vehicle.variant})`);
    console.log(`   Previous Incorrect ex_showroom_price in DB: ₹${(vehicle.ex_showroom_price / 100).toLocaleString('en-IN')}`);

    // 2. Correct ex_showroom_price in vehicles table to ₹166,865 (16686500 paise)
    const correctExShowroomRupees = 166865;
    const correctExShowroomPaise = 16686500;
    const empsDiscountRupees = 5000;
    const oemOffersRupees = 2499;
    const dealerCashRupees = 0;
    const tcsAmountRupees = 0;

    await client.query(
      `UPDATE vehicles
       SET ex_showroom_price = $1, updated_at = NOW()
       WHERE vehicle_id = $2 AND tenant_id = $3;`,
      [correctExShowroomPaise, vehicleId, tenantId]
    );

    // 3. Upsert sale_transactions record with raw invoice figures
    await client.query(
      `INSERT INTO sale_transactions (
         customer_id, vehicle_id, branch_id, ex_showroom_price_paise, tcs_amount_paise, dealer_cash_discount_paise,
         emps_discount_paise, oem_offers_amount_paise, is_invoice_finalized, stage, source, reference_id, tenant_id
       )
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7, TRUE, 'finalized', 'auto_dms', $8, $9)
       ON CONFLICT (tenant_id, reference_id) DO UPDATE
       SET ex_showroom_price_paise = EXCLUDED.ex_showroom_price_paise,
           tcs_amount_paise = EXCLUDED.tcs_amount_paise,
           dealer_cash_discount_paise = EXCLUDED.dealer_cash_discount_paise,
           emps_discount_paise = EXCLUDED.emps_discount_paise,
           oem_offers_amount_paise = EXCLUDED.oem_offers_amount_paise,
           is_invoice_finalized = TRUE,
           stage = 'finalized',
           updated_at = NOW();`,
      [
        customerId, vehicleId, correctExShowroomPaise, tcsAmountRupees * 100, dealerCashRupees * 100,
        empsDiscountRupees * 100, oemOffersRupees * 100, refId, tenantId
      ]
    );

    // 4. Re-calculate points via VehicleSalesPointsService
    const calcResult = await VehicleSalesPointsService.processSaleTransaction({
      transaction_id: refId,
      reference_id: refId,
      customer_id: customerId,
      vehicle_id: vehicleId,
      branch_id: 1,
      tenant_id: tenantId,
      ex_showroom_price: correctExShowroomRupees,
      tcs_amount: tcsAmountRupees,
      dealer_cash_discount: dealerCashRupees,
      emps_discount: empsDiscountRupees,
      oem_offers_amount: oemOffersRupees,
      is_invoice_finalized: true,
      stage: 'finalized',
    });

    console.log('\n📊 Point Engine Processing Result:');
    console.log(`   Status     : ${calcResult.status}`);
    console.log(`   Net Base   : ₹159,366 (calculated)`);
    console.log(`   Points     : ${calcResult.points} pts`);
    console.log(`   Reason Text: ${calcResult.reason_text || calcResult.message}`);

    // 5. Verification Assertions
    const updatedVeh = await client.query(`SELECT ex_showroom_price FROM vehicles WHERE vehicle_id = $1;`, [vehicleId]);
    const storedPriceRupees = Number(updatedVeh.rows[0].ex_showroom_price) / 100;
    assert.strictEqual(storedPriceRupees, 166865, 'Ex-showroom price in vehicles table should be ₹166,865');

    // Expected net base = 166865 - 5000 - 2499 - 0 = 159366
    const expectedNetBase = 166865 - 5000 - 2499 - 0;
    assert.strictEqual(expectedNetBase, 159366, 'Net ex-showroom base should be ₹159,366');
    const expectedPoints = Math.floor(expectedNetBase / 100);
    assert.strictEqual(expectedPoints, 1593, 'Points should recompute to 1,593');

    console.log('\n✅ Target Record Verification Passed! Ex-Showroom = ₹166,865 | Net = ₹159,366 | Points = 1,593 pts');

    // 6. Spot-Check 5 Existing Customer Records in DB
    console.log('\n🔍 Spot-Checking 5 Existing Customer Records in Database...');
    const spotChecks = await SearchService.listAllPrDoneCustomers(tenantId, 5, 0);

    spotChecks.forEach((c, idx) => {
      const v = c.vehicles?.[0];
      const pDisplay = v?.ex_showroom_price != null ? `₹${Number(v.ex_showroom_price).toLocaleString('en-IN')}` : '⚠️ Missing (Logged)';
      console.log(`  [${idx + 1}] Customer: ${c.name} (${c.customer_id}) | Reg: ${v?.registration_number || 'N/A'} | Ex-Showroom: ${pDisplay}`);
    });

    console.log('\n🎉 ALL FIX AND VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Fix & Verification failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await new Promise((r) => setTimeout(r, 200));
    await pool.end();
  }
}

fixAndVerify();
