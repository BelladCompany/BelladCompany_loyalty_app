require('dotenv').config();
const { pool } = require('../src/config/db');
const { hashIdentifier, encrypt, lastDigits } = require('../src/utils/crypto.util');
const VehiclePointsEngine = require('../src/services/vehiclePointsEngine.service');

const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';
const TABLE_NAME = process.env.APPSHEET_TABLE_NAME || 'VIN order form';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'bellad_and_company';

function parseDmsDate(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const parts = trimmed.split('/');
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (p1 > 12) {
      const d = new Date(y, p2 - 1, p1);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    }
    const d = new Date(y, p1 - 1, p2);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

async function fetchAppSheetPRDoneRows() {
  let targetTable = TABLE_NAME;
  if (targetTable === 'Tally Billing Master') {
    targetTable = 'VIN order form';
  }

  const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(targetTable)}/Action`;

  console.log(`📡 Fetching rows from AppSheet API (Table: '${targetTable}')...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ApplicationAccessKey': APPSHEET_ACCESS_KEY,
    },
    body: JSON.stringify({
      Action: 'Find',
      Properties: { Locale: 'en-US' },
      Rows: [],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AppSheet API error ${response.status}: ${errText}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) return [];

  // Filter strictly for PR Completed / PR Done rows
  const prDoneRows = rows.filter((r) => {
    const billingStatus = String(r['Billing Status'] || '').trim().toLowerCase();
    const status = String(r['Status'] || '').trim().toLowerCase();
    const orderStatus = String(r['Order Form Status'] || '').trim().toLowerCase();

    return (
      billingStatus === 'pr done' ||
      billingStatus.includes('pr done') ||
      billingStatus.includes('pr') ||
      status.includes('pr done') ||
      orderStatus.includes('pr done')
    );
  });

  return { totalRows: rows.length, prDoneRows };
}

async function wipeAndSync() {
  const client = await pool.connect();
  try {
    console.log('\n🧹 Step 1: Wiping existing data from PostgreSQL tables...');

    // Disable modification trigger on points_ledger
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification') THEN
          ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;
        END IF;
      END $$;
    `);

    // Truncate tables cleanly
    const tablesToWipe = [
      'points_ledger',
      'service_transactions',
      'vehicles',
      'customer_phones',
      'nominees',
      'kyc_change_requests',
      'public_balance_tokens',
      'appsheet_pull_log',
      'appsheet_webhook_log',
      'customer_merge_log',
      'customers'
    ];

    for (const table of tablesToWipe) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE;`).catch((err) => {
        console.warn(`   ⚠️ Warning truncating ${table}:`, err.message);
      });
    }

    // Reset sequence if present
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'customer_id_seq') THEN
          ALTER SEQUENCE customer_id_seq RESTART WITH 100001;
        END IF;
      END $$;
    `);

    // Re-enable trigger
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification') THEN
          ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
        END IF;
      END $$;
    `);

    console.log('✅ PostgreSQL data wiped successfully!');

    console.log('\n📥 Step 2: Fetching fresh PR Completed rows from AppSheet...');
    const { totalRows, prDoneRows } = await fetchAppSheetPRDoneRows();
    console.log(`✅ AppSheet fetch complete: Found ${prDoneRows.length} PR Done rows out of ${totalRows} total rows.`);

    console.log('\n⚙️ Step 3: Pushing PR Done customer & vehicle details into PostgreSQL...');
    let syncedCount = 0;

    for (const row of prDoneRows) {
      const orderId = row['Order Unique ID'] || row['DMS Booking ID'] || row['_RowNumber'];
      const custId = orderId ? `BAC-${orderId}` : null;
      const custName = (row['Customer Name'] || row['Customer Ledger Name'] || 'Customer').trim();
      const mainPhone = (row['Customer Number'] || row['Customer Alt Number'] || '').trim().replace(/\D/g, '');
      const altPhone = (row['Customer Alt Number'] || '').trim().replace(/\D/g, '');
      const ageVal = parseInt(row['CX Age'] || row['Age'] || '0', 10) || null;
      const aadhaarRaw = (row['Aadhar Card No'] || row['Aadhaar Card No'] || '').trim().replace(/\D/g, '');
      const aadhaarNumber = aadhaarRaw.length >= 8 ? aadhaarRaw : null;
      const addressVal = row['Address 1'] || row['Rental Address'] || row['Customer Address'] || null;
      const firmVal = row['Firm'] || row['Firm Name'] || null;
      const gstVal = row['GST Number'] || row['GST_Number'] || null;
      const nomineeVal = row['Nominee Name'] || null;
      const relationVal = row['Relation'] || null;
      const emailVal = row['Email'] || null;
      const branchName = row['Branch'] || row['Branch Name'] || null;
      const branchAddress = row['Branch Address'] || row['Branch Adress'] || null;
      const dmsInvoiceNo = row['DMS Invoice Number'] || null;
      const dmsInvoiceDate = row['DMS Invoice Date'] || null;
      const salesConsultant = row['Sales Consultant'] || null;

      let aadhaarHash = null;
      let aadhaarLast4Enc = null;
      if (aadhaarRaw && aadhaarRaw.length === 12) {
        aadhaarHash = hashIdentifier(aadhaarRaw);
        aadhaarLast4Enc = encrypt(lastDigits(aadhaarRaw, 4));
      }

      // Check if customer already exists in DB strictly by aadhaar_number, aadhaar_hash, or verified phone + name
      let resolvedCustomerId = null;

      // 1. Primary Match: Check strictly by Aadhaar Number or Aadhaar Hash if present
      if (aadhaarNumber) {
        const aNumCheck = await client.query(
          `SELECT customer_id FROM customers WHERE tenant_id = $1 AND aadhaar_number = $2 LIMIT 1;`,
          [DEFAULT_TENANT_ID, aadhaarNumber]
        );
        if (aNumCheck.rows.length > 0) {
          resolvedCustomerId = aNumCheck.rows[0].customer_id;
        }
      }

      if (!resolvedCustomerId && aadhaarHash) {
        const aCheck = await client.query(
          `SELECT customer_id FROM customers WHERE tenant_id = $1 AND aadhaar_hash = $2 LIMIT 1;`,
          [DEFAULT_TENANT_ID, aadhaarHash]
        );
        if (aCheck.rows.length > 0) {
          resolvedCustomerId = aCheck.rows[0].customer_id;
        }
      }

      // 2. Secondary Match: Check by phone_number ONLY IF customer names match or neither has a conflicting Aadhaar
      if (!resolvedCustomerId && mainPhone) {
        const pCheck = await client.query(
          `SELECT c.customer_id, c.customer_name, c.aadhaar_number
           FROM customer_phones p
           JOIN customers c ON p.customer_id = c.customer_id
           WHERE p.tenant_id = $1 AND p.phone_number = $2 LIMIT 1;`,
          [DEFAULT_TENANT_ID, mainPhone]
        );
        if (pCheck.rows.length > 0) {
          const existing = pCheck.rows[0];
          const existingName = (existing.customer_name || '').trim().toLowerCase();
          const currentName = custName.trim().toLowerCase();
          
          if (existingName === currentName || !existing.aadhaar_number || !aadhaarNumber) {
            resolvedCustomerId = existing.customer_id;
          }
        }
      }

      let customerId = resolvedCustomerId;

      if (customerId) {
        // Update existing customer record with any missing details
        await client.query(
          `UPDATE customers
           SET customer_name = COALESCE(customers.customer_name, $1),
               age = COALESCE(customers.age, $2),
               aadhaar_number = COALESCE(customers.aadhaar_number, $3),
               aadhaar_hash = COALESCE(customers.aadhaar_hash, $4),
               aadhaar_last4_enc = COALESCE(customers.aadhaar_last4_enc, $5),
               address = COALESCE(customers.address, $6),
               firm_name = COALESCE(customers.firm_name, $7),
               branch_name = COALESCE(customers.branch_name, $8),
               branch_address = COALESCE(customers.branch_address, $9),
               dms_invoice_number = COALESCE(customers.dms_invoice_number, $10),
               dms_invoice_date = COALESCE(customers.dms_invoice_date, $11),
               sales_consultant = COALESCE(customers.sales_consultant, $12)
           WHERE customer_id = $13 AND tenant_id = $14;`,
          [
            custName, ageVal, aadhaarNumber, aadhaarHash, aadhaarLast4Enc, addressVal, firmVal,
            branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, customerId, DEFAULT_TENANT_ID
          ]
        );
      } else {
        // Insert new customer record
        if (custId) {
          const cRes = await client.query(
            `INSERT INTO customers (
               customer_id, customer_name, age, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
               address, firm_name, gst_number, nominee_name, nominee_relation, email,
               branch_name, branch_address, dms_invoice_number, dms_invoice_date, sales_consultant, tenant_id
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
             ON CONFLICT (customer_id) DO UPDATE SET
               customer_name = EXCLUDED.customer_name
             RETURNING customer_id;`,
            [
              custId, custName, ageVal, aadhaarNumber, aadhaarHash, aadhaarLast4Enc,
              addressVal, firmVal, gstVal, nomineeVal, relationVal, emailVal,
              branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, DEFAULT_TENANT_ID
            ]
          );
          customerId = cRes.rows[0].customer_id;
        } else {
          const cRes = await client.query(
            `INSERT INTO customers (
               customer_name, age, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
               address, firm_name, gst_number, nominee_name, nominee_relation, email,
               branch_name, branch_address, dms_invoice_number, dms_invoice_date, sales_consultant, tenant_id
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING customer_id;`,
            [
              custName, ageVal, aadhaarNumber, aadhaarHash, aadhaarLast4Enc,
              addressVal, firmVal, gstVal, nomineeVal, relationVal, emailVal,
              branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, DEFAULT_TENANT_ID
            ]
          );
          customerId = cRes.rows[0].customer_id;
        }
      }

      // 2. Insert phones
      const phonesToInsert = [...new Set([mainPhone, altPhone].filter((p) => p && p.length >= 10))];
      if (phonesToInsert.length === 0) {
        phonesToInsert.push(`999${Math.floor(1000000 + Math.random() * 9000000)}`);
      }

      for (let i = 0; i < phonesToInsert.length; i++) {
        const phone = phonesToInsert[i];
        await client.query(
          `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (phone_number) DO NOTHING;`,
          [customerId, phone, i === 0, DEFAULT_TENANT_ID]
        );
      }

      // 3. Insert vehicle details
      const vin = (row['VIN Number'] || row['VIN No'] || row['Chassis Number'] || '').trim();
      const regNo = (row['Reg Number'] || row['Reg No'] || row['Registration Number'] || '').trim();
      const chassis = vin || regNo || orderId || `VIN-${syncedCount + 1}`;
      const brandName = row['Brand'] || null;
      const modelName = row['Model'] || 'Vehicle';
      const variantName = row['Variant'] || row['Varient'] || null;
      const fuelType = row['Fuel Type'] || row['Fuel'] || row['Engine Type'] || null;
      const exShowroomAmount = VehiclePointsEngine.cleanNumber(row['Ex-Showroom Price'] || row['Net Ex-Showroom Price'] || row['Total Vehicle Billing Amount'] || 0);
      const exShowroomPaise = Math.round(exShowroomAmount * 100);

      const tcsAmount = VehiclePointsEngine.cleanNumber(row['TCS % Amount'] || row['TCS Amount'] || row['TCS'] || 0);
      const dealerDiscount = VehiclePointsEngine.cleanNumber(row['Dealer Cash Discount'] || row['Dealer Discount'] || row['Discount/FAIM'] || 0);
      const empsDiscount = VehiclePointsEngine.cleanNumber(row['EMPS Discount'] || row['EMPS'] || row['Other Discount Amount'] || row['Other Discount'] || 0);
      const oemOffers = VehiclePointsEngine.cleanNumber(row['OEM Offers Amount'] || row['OEM Offers Total Amount'] || row['OEM Offers'] || row['Offers Amount'] || 0);

      const calcResult = VehiclePointsEngine.calculatePoints(
        {
          ex_showroom_price: exShowroomAmount,
          tcs_amount: tcsAmount,
          dealer_cash_discount: dealerDiscount,
          emps_discount: empsDiscount,
          oem_offers_amount: oemOffers,
        },
        0.01
      );

      // Parse purchase date from DMS invoice date
      const parsedPurchaseDate = parseDmsDate(dmsInvoiceDate);

      const vRes = await client.query(
        `INSERT INTO vehicles (
           customer_id, chassis_no, vin, registration_number, model, variant, fuel_type,
           brand_name, branch_name, branch_address, firm_name, ex_showroom_price,
           dms_invoice_number, dms_invoice_date, sales_consultant, purchase_date,
           redemption_eligible_at, redemption_expires_at, tenant_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                 CASE WHEN $16::text IS NOT NULL AND $16::text != '' THEN ($16::date + INTERVAL '12 months')::TIMESTAMPTZ ELSE NULL END,
                 CASE WHEN $16::text IS NOT NULL AND $16::text != '' THEN ($16::date + INTERVAL '24 months')::TIMESTAMPTZ ELSE NULL END,
                 $17)
         RETURNING vehicle_id;`,
        [
          customerId, chassis, vin || chassis, regNo, modelName, variantName, fuelType,
          brandName, branchName, branchAddress, firmVal, exShowroomPaise,
          dmsInvoiceNo, dmsInvoiceDate, salesConsultant, parsedPurchaseDate, DEFAULT_TENANT_ID
        ]
      );
      const vehicleId = vRes.rows[0].vehicle_id;

      // 4. Calculate & insert initial sales points based on net points_base
      const salesPoints = calcResult.points;
      if (salesPoints > 0) {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification') THEN
              ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;
            END IF;
          END $$;
        `);

        await client.query(
          `INSERT INTO points_ledger (
             customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, tenant_id, reason_type, reason_text
           )
           VALUES ($1, $2, 1, 'earn_sale', 'sale', $3, $4, $5, 'purchase', $6);`,
          [customerId, vehicleId, salesPoints, `PR Done Sales Sync: ${orderId}`, DEFAULT_TENANT_ID, calcResult.reason_text]
        );

        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification') THEN
              ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
            END IF;
          END $$;
        `);
      }

      syncedCount++;
      if (syncedCount % 500 === 0) {
        console.log(`   ⏳ Processed ${syncedCount} / ${prDoneRows.length} PR Done records...`);
      }
    }

    console.log(`\n🎉 Success! Synchronized ${syncedCount} fresh PR Done customer profiles into PostgreSQL.`);

  } catch (err) {
    console.error('\n❌ Wipe and sync failed:', err.message || err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

wipeAndSync().catch(() => process.exit(1));
