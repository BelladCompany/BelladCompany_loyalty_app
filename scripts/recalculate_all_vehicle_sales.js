require('dotenv').config();
const { pool } = require('../src/config/db');
const AppSheetPullService = require('../src/services/appsheetPull.service');
const VehiclePointsEngine = require('../src/services/vehiclePointsEngine.service');
const VehicleSalesPointsService = require('../src/services/vehicleSalesPoints.service');

async function recalculateAllVehicleSales() {
  console.log('===============================================================');
  console.log('🚀 [Batch Job] Starting One-Time Recalculation of ALL Vehicle Sales');
  console.log('   Formula: net_ex_showroom_price = ex_showroom_price - total_discount_amount');
  console.log('   Points: Math.floor(net_ex_showroom_price * rate)');
  console.log('   Rule: In-place overwrite on points_ledger (exactly 1 row per vehicle sale)');
  console.log('===============================================================\n');

  const client = await pool.connect();

  try {
    // 1. Fetch AppSheet rows across all configured tables for accurate discount lookup
    console.log('📡 Step 1: Fetching AppSheet table rows for discount field lookup...');
    const tableNames = AppSheetPullService.getTableNames();
    const appsheetMap = new Map(); // Keyed by VIN, Order Unique ID, Chassis, Reg Number

    // Process in reverse order so 'VIN order form' takes priority over 'Tally Billing Master'
    for (const tableName of [...tableNames].reverse()) {
      try {
        const url = `https://www.appsheet.com/api/v2/apps/${process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de'}/tables/${encodeURIComponent(tableName)}/Action`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ApplicationAccessKey': process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY',
          },
          body: JSON.stringify({
            Action: 'Find',
            Properties: { Locale: 'en-US' },
            Rows: [],
          }),
        });

        if (response.ok) {
          const rows = await response.json();
          console.log(`   - Table '${tableName}': Fetched ${rows.length} rows.`);
          for (const r of rows) {
            const vin = (r['VIN Number'] || r['VIN No'] || r['Chassis Number'] || '').trim().toUpperCase();
            const orderId = (r['Order Unique ID'] || r['DMS Booking ID'] || '').trim().toUpperCase();
            const regNo = (r['Reg Number'] || r['Registration Number'] || '').trim().toUpperCase();
            if (vin && (!appsheetMap.has(vin) || tableName === 'VIN order form')) appsheetMap.set(vin, r);
            if (orderId && (!appsheetMap.has(orderId) || tableName === 'VIN order form')) appsheetMap.set(orderId, r);
            if (regNo && (!appsheetMap.has(regNo) || tableName === 'VIN order form')) appsheetMap.set(regNo, r);
          }
        } else {
          console.warn(`   - Table '${tableName}' fetch returned status ${response.status}`);
        }
      } catch (tableErr) {
        console.warn(`   - Warning fetching table '${tableName}':`, tableErr.message || tableErr);
      }
    }
    console.log(`   Total unique AppSheet lookup keys: ${appsheetMap.size}\n`);

    // 2. Fetch all vehicle sale points ledger entries from database
    console.log('🔍 Step 2: Fetching vehicle sale rows from points_ledger...');
    const ledgerRes = await client.query(`
      SELECT 
        pl.entry_id, pl.tenant_id, pl.customer_id, pl.vehicle_id, pl.points, pl.source_ref, pl.type, pl.reason_type, pl.reason_text,
        v.chassis_no, v.vin, v.registration_number, v.ex_showroom_price AS vehicle_ex_showroom_paise,
        st.id AS sale_tx_id, st.ex_showroom_price_paise, st.dealer_cash_discount_paise, st.emps_discount_paise, st.oem_offers_amount_paise
      FROM points_ledger pl
      LEFT JOIN vehicles v ON pl.vehicle_id = v.vehicle_id
      LEFT JOIN sale_transactions st ON (pl.source_ref = st.reference_id OR pl.source_ref LIKE '%' || st.reference_id)
      WHERE pl.type = 'earn_sale' AND pl.transaction_category = 'sale'
      ORDER BY pl.entry_id ASC;
    `);

    const ledgerRows = ledgerRes.rows;
    console.log(`   Found ${ledgerRows.length} vehicle sale rows in points_ledger.\n`);

    // Enable ledger updates in session
    await client.query("SET loyalty.allow_ledger_update = 'on';");

    // Clean up any legacy duplicate / adjustment rows for vehicle sales
    console.log('🧹 Step 3: Checking for duplicate or adjustment rows in points_ledger...');
    const dupRes = await client.query(`
      SELECT entry_id
      FROM points_ledger
      WHERE (type = 'adjust' OR reason_type = 'manual_adjustment')
        AND (transaction_category = 'sale' OR source_ref LIKE '%sale%' OR source_ref LIKE '%Sync%');
    `);
    if (dupRes.rows.length > 0) {
      const dupIds = dupRes.rows.map(r => r.entry_id);
      await client.query(`DELETE FROM points_ledger WHERE entry_id = ANY($1::bigint[]);`, [dupIds]);
      console.log(`   Deleted ${dupIds.length} legacy adjustment/duplicate rows from points_ledger.\n`);
    } else {
      console.log(`   No legacy adjustment rows found to clean up.\n`);
    }

    // 3. Process each vehicle sale row and recalculate points & net ex-showroom price
    console.log('⚡ Step 4: Recalculating and overwriting rows in-place...');
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalPointsChanged = 0;
    const affectedCustomerIds = new Set();
    const tenantRateCache = new Map();

    for (const pl of ledgerRows) {
      totalProcessed++;
      const tenantId = pl.tenant_id || 'bellad_and_company';

      // Get tenant rate config
      if (!tenantRateCache.has(tenantId)) {
        const rateRule = await VehicleSalesPointsService.getTenantRate(tenantId, client);
        tenantRateCache.set(tenantId, rateRule);
      }
      const rateConfig = tenantRateCache.get(tenantId);

      // Lookup matching AppSheet row or DB values
      const vinKey = (pl.vin || pl.chassis_no || '').trim().toUpperCase();
      const refKey = (pl.source_ref || '').replace(/^.*:\s*/, '').trim().toUpperCase();
      const regKey = (pl.registration_number || '').trim().toUpperCase();

      const asRow = appsheetMap.get(vinKey) || appsheetMap.get(refKey) || appsheetMap.get(regKey);

      let exShowroom = 0;
      let dealerDisc = 0;
      let empsDisc = 0;
      let oemOffers = 0;
      let additionalDiscounts = [];

      if (asRow) {
        exShowroom = VehiclePointsEngine.cleanNumber(asRow['Ex-Showroom Price'] || asRow['Ex Showroom Price']);
        dealerDisc = VehiclePointsEngine.cleanNumber(asRow['Discount/FAIM'] || asRow['Dealer Cash Discount'] || asRow['Dealer Discount'] || asRow['Cash Discount'] || 0);
        empsDisc = VehiclePointsEngine.cleanNumber(asRow['EMPS Discount'] || asRow['EMPS'] || asRow['Other Discount Amount'] || asRow['Other Discount'] || 0);
        oemOffers = VehiclePointsEngine.cleanNumber(asRow['OEM Offers Total Amount'] || asRow['OEM Offers Amount'] || asRow['OEM Offers'] || asRow['Offers Amount'] || 0);

        if (asRow['Additional Discounts'] && Array.isArray(asRow['Additional Discounts'])) {
          additionalDiscounts = asRow['Additional Discounts'];
        }
      }

      // Fallback to DB sale_transactions or vehicle record if AppSheet row didn't have exShowroom
      if (exShowroom <= 0) {
        if (pl.ex_showroom_price_paise) {
          exShowroom = Number(pl.ex_showroom_price_paise) / 100;
        } else if (pl.vehicle_ex_showroom_paise) {
          exShowroom = Number(pl.vehicle_ex_showroom_paise) / 100;
        }
      }

      if (dealerDisc <= 0 && pl.dealer_cash_discount_paise) {
        dealerDisc = Number(pl.dealer_cash_discount_paise) / 100;
      }
      if (empsDisc <= 0 && pl.emps_discount_paise) {
        empsDisc = Number(pl.emps_discount_paise) / 100;
      }
      if (oemOffers <= 0 && pl.oem_offers_amount_paise) {
        oemOffers = Number(pl.oem_offers_amount_paise) / 100;
      }

      // Calculate via pure calculation engine
      const calcResult = VehiclePointsEngine.calculatePoints(
        {
          ex_showroom_price: exShowroom,
          dealer_cash_discount: dealerDisc,
          emps_discount: empsDisc,
          oem_offers_amount: oemOffers,
          additional_discounts: additionalDiscounts,
        },
        rateConfig
      );

      // Overwrite points_ledger row directly in place
      await client.query(
        `UPDATE points_ledger
         SET points = $1,
             reason_text = $2
         WHERE entry_id = $3;`,
        [calcResult.points, calcResult.reason_text, pl.entry_id]
      );

      // Also update linked sale_transactions if exists
      if (pl.sale_tx_id) {
        await client.query(
          `UPDATE sale_transactions
           SET ex_showroom_price_paise = $1,
               dealer_cash_discount_paise = $2,
               emps_discount_paise = $3,
               oem_offers_amount_paise = $4,
               points_calculated = TRUE,
               last_processed_at = NOW()
           WHERE id = $5;`,
          [
            Math.round(exShowroom * 100),
            Math.round(dealerDisc * 100),
            Math.round(empsDisc * 100),
            Math.round(oemOffers * 100),
            pl.sale_tx_id,
          ]
        );
      }

      // Also update vehicle ex_showroom_price if vehicle_id exists and exShowroom > 0
      if (pl.vehicle_id && exShowroom > 0) {
        await client.query(
          `UPDATE vehicles
           SET ex_showroom_price = $1
           WHERE vehicle_id = $2;`,
          [Math.round(exShowroom * 100), pl.vehicle_id]
        );
      }

      totalUpdated++;
      if (calcResult.points !== pl.points) {
        totalPointsChanged++;
      }
      if (pl.customer_id) {
        affectedCustomerIds.add(pl.customer_id);
      }
    }

    console.log(`   Recalculation finished: ${totalUpdated} rows updated in points_ledger.`);
    console.log(`   Points changed on ${totalPointsChanged} rows.\n`);

    // 4. Update customer tier snapshots for all affected customers
    console.log(`👑 Step 5: Updating tier snapshots for ${affectedCustomerIds.size} customers...`);
    let tierUpdatedCount = 0;
    for (const custId of affectedCustomerIds) {
      // Find customer tenant
      const custRes = await client.query(`SELECT tenant_id FROM customers WHERE customer_id = $1 LIMIT 1;`, [custId]);
      const tenantId = custRes.rows[0]?.tenant_id || 'bellad_and_company';
      await VehicleSalesPointsService.updateCustomerTierSnapshot(custId, tenantId, client);
      tierUpdatedCount++;
    }
    console.log(`   Updated tier snapshots for ${tierUpdatedCount} customers.\n`);

    console.log('===============================================================');
    console.log('✅ BATCH JOB COMPLETED SUCCESSFULLY');
    console.log(`   - Total points_ledger sale rows processed: ${totalProcessed}`);
    console.log(`   - Total points_ledger rows overwritten in place: ${totalUpdated}`);
    console.log(`   - Total rows with recalculated points value: ${totalPointsChanged}`);
    console.log(`   - Total customers with refreshed tier snapshots: ${tierUpdatedCount}`);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('❌ Batch job failed with error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

recalculateAllVehicleSales();
