require('dotenv').config();
const { pool } = require('../config/db');
const { hashIdentifier, encrypt, lastDigits } = require('../utils/crypto.util');
const VehiclePointsEngine = require('./vehiclePointsEngine.service');

const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';
const TABLE_NAME = process.env.APPSHEET_TABLE_NAME || 'VIN order form';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
const CUTOFF_DATE = '2026-04-01';

class AppSheetSyncEngine {
  /**
   * Parse various date strings into standard YYYY-MM-DD format
   * Supports MM/DD/YYYY, DD/MM/YYYY, ISO, and standard Date strings
   */
  static parseDmsDate(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed) return null;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    }

    // MM/DD/YYYY or DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      const parts = trimmed.split('/');
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);

      // In AppSheet en-US format, p1 is month, p2 is day.
      // If p1 > 12, it is definitely DD/MM/YYYY
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

  /**
   * Determines if an AppSheet row is strictly "PR Done"
   */
  static isPrDone(row) {
    if (!row || typeof row !== 'object') return false;

    const billingStatus = String(row['Billing Status'] || '').trim().toLowerCase();
    const status = String(row['Status'] || '').trim().toLowerCase();
    const orderStatus = String(row['Order Form Status'] || '').trim().toLowerCase();
    const prStatus = String(row['PR Status'] || row['pr_status'] || '').trim().toLowerCase();

    // Positive indicators
    const isPr =
      billingStatus === 'pr done' ||
      billingStatus.includes('pr done') ||
      billingStatus.includes('ok for pr payment') ||
      billingStatus.includes('accounts updated for pr') ||
      status.includes('pr done') ||
      orderStatus.includes('pr done') ||
      prStatus.includes('pr done');

    // Negative indicators (cancelled/rejected)
    const isCancelled =
      billingStatus.includes('cancel') ||
      billingStatus.includes('reject') ||
      status.includes('cancel') ||
      orderStatus.includes('cancel');

    return isPr && !isCancelled;
  }

  /**
   * Resolves the primary date of an AppSheet row and verifies it is >= 2026-04-01
   */
  static getEligibleDate(row) {
    const rawDate =
      row['DMS Invoice Date'] ||
      row['Invoice Date'] ||
      row['DMS Booking Date'] ||
      row['Delivery Date'] ||
      row['Vehicle Delivery Date'] ||
      row['Order Date'] ||
      row['Created Time'] ||
      row['Upload Date Time'];

    const parsed = this.parseDmsDate(rawDate);
    if (!parsed) {
      return { eligible: false, parsedDate: null, reason: 'Missing or unparseable date' };
    }

    if (parsed < CUTOFF_DATE) {
      return { eligible: false, parsedDate: parsed, reason: `Date ${parsed} is before cutoff ${CUTOFF_DATE}` };
    }

    return { eligible: true, parsedDate: parsed };
  }

  /**
   * Resolves branch_id from branch_name or location
   */
  static async resolveBranchId(branchInput, tenantId) {
    if (!branchInput) return 1;
    const cleanBranch = String(branchInput).trim();

    try {
      const res = await pool.query(
        `SELECT branch_id FROM branches
         WHERE tenant_id = $1 AND (branch_id::text = $2 OR branch_name ILIKE $2 OR branch_city ILIKE $2)
         LIMIT 1;`,
        [tenantId, cleanBranch]
      );
      if (res.rows.length > 0) return res.rows[0].branch_id;

      // Fuzzy match
      const allBranches = await pool.query(`SELECT branch_id, branch_name, branch_city FROM branches WHERE tenant_id = $1`, [tenantId]);
      const lower = cleanBranch.toLowerCase();
      const match = allBranches.rows.find((b) => {
        const bName = (b.branch_name || '').toLowerCase();
        const bCity = (b.branch_city || '').toLowerCase();
        return bName.includes(lower) || lower.includes(bName) || (bCity && lower.includes(bCity));
      });

      return match ? match.branch_id : 1;
    } catch (err) {
      return 1;
    }
  }

  /**
   * Resolves or auto-creates customer in PostgreSQL using phone number or Aadhaar hash
   */
  static async resolveOrCreateCustomer(row, tenantId, client) {
    const custName = (row['Customer Name'] || row['Customer Ledger Name'] || 'Customer').trim();
    const mainPhone = (row['Customer Number'] || row['Customer Alt Number'] || '').trim().replace(/\D/g, '');
    const altPhone = (row['Customer Alt Number'] || '').trim().replace(/\D/g, '');
    const aadhaarRaw = (row['Aadhar Card No'] || row['Aadhaar Card No'] || '').trim().replace(/\D/g, '');
    const aadhaarNumber = aadhaarRaw.length >= 8 ? aadhaarRaw : null;

    const orderId = row['Order Unique ID'] || row['DMS Booking ID'] || row['_RowNumber'];
    const preferredId = orderId ? `BAC-${orderId}` : null;

    let aadhaarHash = null;
    let aadhaarLast4Enc = null;
    if (aadhaarRaw && aadhaarRaw.length === 12) {
      aadhaarHash = hashIdentifier(aadhaarRaw);
      aadhaarLast4Enc = encrypt(lastDigits(aadhaarRaw, 4));
    }

    let resolvedCustomerId = null;

    // 1. Match by Aadhaar Number or Hash
    if (aadhaarNumber) {
      const aRes = await client.query(
        `SELECT customer_id FROM customers WHERE tenant_id = $1 AND aadhaar_number = $2 AND is_merged = FALSE LIMIT 1;`,
        [tenantId, aadhaarNumber]
      );
      if (aRes.rows.length > 0) resolvedCustomerId = aRes.rows[0].customer_id;
    }

    if (!resolvedCustomerId && aadhaarHash) {
      const aHashRes = await client.query(
        `SELECT customer_id FROM customers WHERE tenant_id = $1 AND aadhaar_hash = $2 AND is_merged = FALSE LIMIT 1;`,
        [tenantId, aadhaarHash]
      );
      if (aHashRes.rows.length > 0) resolvedCustomerId = aHashRes.rows[0].customer_id;
    }

    // 2. Match by Phone Number
    if (!resolvedCustomerId && mainPhone) {
      const pRes = await client.query(
        `SELECT c.customer_id, c.customer_name, c.aadhaar_number
         FROM customer_phones p
         JOIN customers c ON p.customer_id = c.customer_id
         WHERE p.tenant_id = $1 AND p.phone_number = $2 AND c.is_merged = FALSE LIMIT 1;`,
        [tenantId, mainPhone]
      );
      if (pRes.rows.length > 0) {
        const existing = pRes.rows[0];
        const existingName = (existing.customer_name || '').trim().toLowerCase();
        const currentName = custName.toLowerCase();
        if (existingName === currentName || !existing.aadhaar_number || !aadhaarNumber) {
          resolvedCustomerId = existing.customer_id;
        }
      }
    }

    const ageVal = parseInt(row['CX Age'] || row['Age'] || '0', 10) || null;
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

    if (resolvedCustomerId) {
      // Update existing customer record with any missing profile details
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
             sales_consultant = COALESCE(customers.sales_consultant, $12),
             updated_at = NOW()
         WHERE customer_id = $13 AND tenant_id = $14;`,
        [
          custName, ageVal, aadhaarNumber, aadhaarHash, aadhaarLast4Enc, addressVal, firmVal,
          branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, resolvedCustomerId, tenantId
        ]
      );
    } else {
      // Insert new customer
      if (preferredId) {
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
            preferredId, custName, ageVal, aadhaarNumber, aadhaarHash, aadhaarLast4Enc,
            addressVal, firmVal, gstVal, nomineeVal, relationVal, emailVal,
            branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, tenantId
          ]
        );
        resolvedCustomerId = cRes.rows[0].customer_id;
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
            branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, tenantId
          ]
        );
        resolvedCustomerId = cRes.rows[0].customer_id;
      }
    }

    // Insert phone records
    const phones = [...new Set([mainPhone, altPhone].filter((p) => p && p.length >= 10))];
    if (phones.length === 0) {
      phones.push(`999${Math.floor(1000000 + Math.random() * 9000000)}`);
    }

    for (let i = 0; i < phones.length; i++) {
      await client.query(
        `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (phone_number) DO NOTHING;`,
        [resolvedCustomerId, phones[i], i === 0, tenantId]
      );
    }

    return resolvedCustomerId;
  }

  /**
   * Resolves or auto-creates vehicle linked to customer
   */
  static async resolveOrCreateVehicle(row, customerId, tenantId, parsedDate, client) {
    const vin = (row['VIN Number'] || row['VIN No'] || row['Chassis Number'] || '').trim();
    const regNo = (row['Reg Number'] || row['Reg No'] || row['Registration Number'] || '').trim();
    const orderId = row['Order Unique ID'] || row['DMS Booking ID'] || row['_RowNumber'];
    const chassis = vin || regNo || orderId || `VIN-${Date.now()}`;

    const brandName = (row['Brand'] || '').trim() || null;
    const modelName = (row['Model'] || 'Vehicle').trim();
    const variantName = (row['Variant'] || row['Varient'] || '').trim() || null;
    const fuelType = (row['Fuel Type'] || row['Fuel'] || row['Engine Type'] || '').trim() || null;
    const firmName = (row['Firm'] || row['Firm Name'] || '').trim() || null;
    const branchName = (row['Branch'] || row['Branch Name'] || '').trim() || null;
    const branchAddress = (row['Branch Address'] || row['Branch Adress'] || '').trim() || null;
    const dmsInvoiceNo = (row['DMS Invoice Number'] || '').trim() || null;
    const dmsInvoiceDate = (row['DMS Invoice Date'] || '').trim() || null;
    const salesConsultant = (row['Sales Consultant'] || '').trim() || null;

    const exShowroomAmount = VehiclePointsEngine.cleanNumber(
      row['Ex-Showroom Price'] || row['Ex Showroom Price'] || row['Net Ex-Showroom Price'] || row['Total Vehicle Billing Amount'] || 0
    );
    const exShowroomPaise = Math.round(exShowroomAmount * 100);

    const vehCheck = await client.query(
      `SELECT vehicle_id FROM vehicles WHERE tenant_id = $1 AND (chassis_no = $2 OR (registration_number IS NOT NULL AND registration_number != '' AND registration_number = $3)) LIMIT 1;`,
      [tenantId, chassis, regNo || null]
    );

    if (vehCheck.rows.length > 0) {
      const existingVid = vehCheck.rows[0].vehicle_id;
      await client.query(
        `UPDATE vehicles
         SET customer_id = $1,
             model = COALESCE(model, $2),
             variant = COALESCE(variant, $3),
             brand_name = COALESCE(brand_name, $4),
             branch_name = COALESCE(branch_name, $5),
             branch_address = COALESCE(branch_address, $6),
             ex_showroom_price = CASE WHEN ex_showroom_price IS NULL OR ex_showroom_price = 0 THEN $7 ELSE ex_showroom_price END,
             dms_invoice_number = COALESCE(dms_invoice_number, $8),
             dms_invoice_date = COALESCE(dms_invoice_date, $9::varchar),
             purchase_date = COALESCE(purchase_date, $10::date),
             updated_at = NOW()
         WHERE vehicle_id = $11 AND tenant_id = $12;`,
        [
          customerId, modelName, variantName, brandName, branchName, branchAddress,
          exShowroomPaise, dmsInvoiceNo, dmsInvoiceDate || parsedDate, parsedDate, existingVid, tenantId
        ]
      );
      return existingVid;
    }

    const insRes = await client.query(
      `INSERT INTO vehicles (
         customer_id, chassis_no, vin, registration_number, model, variant, fuel_type,
         brand_name, branch_name, branch_address, firm_name, ex_showroom_price,
         dms_invoice_number, dms_invoice_date, sales_consultant, purchase_date,
         redemption_eligible_at, redemption_expires_at, tenant_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::date,
               CASE WHEN $16::date IS NOT NULL THEN ($16::date + INTERVAL '12 months')::TIMESTAMPTZ ELSE NULL END,
               CASE WHEN $16::date IS NOT NULL THEN ($16::date + INTERVAL '24 months')::TIMESTAMPTZ ELSE NULL END,
               $17)
       RETURNING vehicle_id;`,
      [
        customerId, chassis, vin || chassis, regNo, modelName, variantName, fuelType,
        brandName, branchName, branchAddress, firmName, exShowroomPaise,
        dmsInvoiceNo, dmsInvoiceDate, salesConsultant, parsedDate, tenantId
      ]
    );

    return insRes.rows[0].vehicle_id;
  }

  /**
   * Process a single line item pulled or received from AppSheet
   * Strictly READ-ONLY with respect to AppSheet: never writes, edits, or pushes anything to AppSheet.
   */
  static async processSingleRow(row, tenantId = DEFAULT_TENANT_ID) {
    // 1. Verify PR Done
    if (!this.isPrDone(row)) {
      return {
        status: 'skipped',
        reason: 'Row is not in PR Done status',
        billing_status: row['Billing Status'] || row['Status'],
      };
    }

    // 2. Verify Date Eligibility (>= 2026-04-01)
    const dateCheck = this.getEligibleDate(row);
    if (!dateCheck.eligible) {
      return {
        status: 'skipped',
        reason: dateCheck.reason,
        parsedDate: dateCheck.parsedDate,
      };
    }

    const orderId = row['Order Unique ID'] || row['DMS Booking ID'] || row['_RowNumber'];
    const exShowroomAmount = VehiclePointsEngine.cleanNumber(
      row['Ex-Showroom Price'] || row['Ex Showroom Price'] || row['Net Ex-Showroom Price'] || row['Total Vehicle Billing Amount'] || 0
    );

    if (exShowroomAmount <= 0) {
      return {
        status: 'skipped',
        reason: 'Ex-Showroom price is missing or zero',
        orderId,
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 3. Resolve / Upsert Customer
      const customerId = await this.resolveOrCreateCustomer(row, tenantId, client);

      // 4. Resolve / Upsert Vehicle
      const vehicleId = await this.resolveOrCreateVehicle(row, customerId, tenantId, dateCheck.parsedDate, client);

      // 5. Resolve Branch
      const branchId = await this.resolveBranchId(row['Branch'] || row['Branch Name'], tenantId);

      // 6. Calculate Vehicle Points via Engine
      const tcsAmount = VehiclePointsEngine.cleanNumber(row['TCS % Amount'] || row['TCS Amount'] || row['TCS'] || 0);
      const dealerDiscount = VehiclePointsEngine.cleanNumber(row['Dealer Cash Discount'] || row['Dealer Discount'] || row['Discount/FAIM'] || 0);
      const empsDiscount = VehiclePointsEngine.cleanNumber(row['EMPS Discount'] || row['EMPS'] || row['Other Discount Amount'] || 0);
      const oemOffers = VehiclePointsEngine.cleanNumber(row['OEM Offers Amount'] || row['OEM Offers Total Amount'] || row['Offers Amount'] || 0);

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

      const salesPoints = calcResult.points;
      const sourceRef = `PR Done Sales Sync: ${orderId}`;

      // 7. Check if already credited in points_ledger (Idempotent guard)
      const existingLedger = await client.query(
        `SELECT entry_id, points FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2 AND (source_ref = $3 OR (vehicle_id = $4 AND transaction_category = 'sale'))
         LIMIT 1;`,
        [customerId, tenantId, sourceRef, vehicleId]
      );

      let pointsCredited = 0;
      let isNewCredit = false;

      if (existingLedger.rows.length === 0 && salesPoints > 0) {
        // Insert points credit into points_ledger
        await client.query(
          `INSERT INTO points_ledger (
             customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, tenant_id, reason_type, reason_text
           )
           VALUES ($1, $2, $3, 'earn_sale', 'sale', $4, $5, $6, 'purchase', $7);`,
          [customerId, vehicleId, branchId, salesPoints, sourceRef, tenantId, calcResult.reason_text]
        );
        pointsCredited = salesPoints;
        isNewCredit = true;
      } else if (existingLedger.rows.length > 0) {
        pointsCredited = existingLedger.rows[0].points;
      }

      await client.query('COMMIT');

      // 8. Fetch current total balance
      const balRes = await pool.query(
        `SELECT COALESCE(SUM(points), 0) AS balance FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenantId]
      );
      const newBalance = parseInt(balRes.rows[0]?.balance || 0, 10);
      const custName = (row['Customer Name'] || row['Customer Ledger Name'] || 'Customer').trim();

      return {
        status: 'success',
        isNewCredit,
        orderId,
        customerId,
        vehicleId,
        pointsCredited,
        newBalance,
        date: dateCheck.parsedDate,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[AppSheetSyncEngine Error] Row '${orderId}':`, err.message || err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Pulls and syncs all PR Done rows from April 01, 2026 to till date from AppSheet Cloud API
   */
  static async syncAllPrDoneFromCutoff(tenantId = DEFAULT_TENANT_ID) {
    const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(TABLE_NAME)}/Action`;
    console.log(`\n📡 [AppSheetSyncEngine] Fetching all PR Done rows from AppSheet (Cutoff: ${CUTOFF_DATE} to Till Date)...`);

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
      throw new Error(`AppSheet API fetch failed (${response.status}): ${errText}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error('Unexpected response format from AppSheet API');
    }

    console.log(`   📋 Total raw rows in AppSheet: ${rows.length}`);

    // Filter strictly for PR Done AND Date >= 2026-04-01
    const eligibleRows = rows.filter((r) => {
      if (!this.isPrDone(r)) return false;
      const dateCheck = this.getEligibleDate(r);
      return dateCheck.eligible;
    });

    console.log(`   🎯 Eligible PR Done rows (>= ${CUTOFF_DATE}): ${eligibleRows.length}`);

    let syncedCount = 0;
    let newCreditsCount = 0;
    let skippedCount = 0;
    let erroredCount = 0;
    const errors = [];

    for (const row of eligibleRows) {
      const orderId = row['Order Unique ID'] || row['DMS Booking ID'] || row['_RowNumber'];
      try {
        const res = await this.processSingleRow(row, tenantId);
        if (res.status === 'success') {
          syncedCount++;
          if (res.isNewCredit) newCreditsCount++;
        } else {
          skippedCount++;
        }
      } catch (rowErr) {
        erroredCount++;
        errors.push({ orderId, error: rowErr.message || rowErr });
      }
    }

    // Record sync in appsheet_pull_log
    try {
      await pool.query(
        `INSERT INTO appsheet_pull_log (table_name, rows_fetched, rows_synced, rows_skipped, rows_errored, details, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          TABLE_NAME,
          eligibleRows.length,
          syncedCount,
          skippedCount,
          erroredCount,
          JSON.stringify({ newCreditsCount, errors: errors.slice(0, 20) }),
          tenantId,
        ]
      );
    } catch (logErr) {
      console.warn('[AppSheet Pull Log Warning]', logErr.message || logErr);
    }

    console.log(`\n🏁 [AppSheetSyncEngine] Batch sync complete!`);
    console.log(`   • Total Eligible : ${eligibleRows.length}`);
    console.log(`   • Synced         : ${syncedCount} (${newCreditsCount} newly credited)`);
    console.log(`   • Skipped        : ${skippedCount}`);
    console.log(`   • Errored        : ${erroredCount}\n`);

    return {
      totalFetched: rows.length,
      eligibleRows: eligibleRows.length,
      syncedCount,
      newCreditsCount,
      skippedCount,
      erroredCount,
      errors: errors.slice(0, 10),
    };
  }
}

module.exports = AppSheetSyncEngine;
