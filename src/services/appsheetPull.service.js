require('dotenv').config();
const { pool } = require('../config/db');
const TransactionService = require('./transaction.service');
const CustomerService = require('./customer.service');
const { hashIdentifier } = require('../utils/crypto.util');

const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';

class AppSheetPullService {
  /**
   * Helper to get list of AppSheet table names configured in env
   */
  static getTableNames() {
    const table1 = process.env.APPSHEET_TABLE_NAME || 'VIN order form';
    const table2 = process.env.APPSHEET_TABLE_NAME_2 || 'Tally Billing Master';
    
    // Support comma-separated table list or multiple env vars
    const tables = [table1, table2].filter(Boolean);
    return [...new Set(tables)]; // Unique list
  }

  /**
   * Fetch unsynced rows from an AppSheet table
   */
  static async fetchUnsyncedRows(tableName) {
    const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(tableName)}/Action`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApplicationAccessKey': APPSHEET_ACCESS_KEY,
      },
      body: JSON.stringify({
        Action: 'Find',
        Properties: {
          Locale: 'en-US',
          Selector: `Filter(${tableName}, [SyncedToLoyalty] = false)`,
        },
        Rows: [],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AppSheet API error ${response.status}: ${errText}`);
    }

    let rows = await response.json();
    if (!Array.isArray(rows)) return [];

    // Fallback local filter if Selector expression was ignored by AppSheet API
    return rows.filter((r) => r['SyncedToLoyalty'] !== true && r['SyncedToLoyalty'] !== 'true' && r['SyncedToLoyalty'] !== 'TRUE');
  }

  /**
   * Mark a processed row as SyncedToLoyalty = true in AppSheet via Edit Action
   */
  static async markRowAsSyncedInAppSheet(tableName, keyColumnName, keyValue) {
    if (!keyValue) return;

    const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(tableName)}/Action`;

    try {
      const editPayload = {
        Action: 'Edit',
        Properties: { Locale: 'en-US' },
        Rows: [
          {
            [keyColumnName]: keyValue,
            SyncedToLoyalty: true,
          },
        ],
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ApplicationAccessKey': APPSHEET_ACCESS_KEY,
        },
        body: JSON.stringify(editPayload),
      });

      if (!res.ok) {
        console.warn(`[AppSheet Mark Synced Warning] Table: ${tableName}, Key: ${keyValue}, Status: ${res.status}`);
      }
    } catch (err) {
      console.error(`[AppSheet Mark Synced Error] Table: ${tableName}, Key: ${keyValue}:`, err.message || err);
    }
  }

  /**
   * Resolves or auto-creates customer in PostgreSQL using phone number or Aadhaar hash
   */
  static async resolveOrCreateCustomer(row, tenantId, explicitCustId = null) {
    const mainPhone = (row['Customer Number'] || row['Customer Alt Number'] || '').trim().replace(/\D/g, '');
    const altPhone = (row['Customer Alt Number'] || '').trim().replace(/\D/g, '');
    const aadhaarRaw = (row['Aadhar Card No'] || row['Aadhaar Card No'] || '').trim().replace(/\D/g, '');
    const preferredId = explicitCustId || row['explicit_customer_id'] || (row['Order Unique ID'] ? `BAC-${row['Order Unique ID']}` : null);

    const name = (row['Customer Name'] || row['Customer Ledger Name'] || 'AppSheet Customer').trim();
    const client = await pool.connect();
    try {
      let resolvedCustomerId = null;

      // 1. Primary Match: Resolve strictly by Aadhaar Number or Aadhaar Hash if present
      if (aadhaarRaw && aadhaarRaw.length >= 8) {
        const aRes = await client.query(
          `SELECT customer_id FROM customers WHERE tenant_id = $1 AND (aadhaar_number = $2 OR (aadhaar_hash IS NOT NULL AND aadhaar_hash = $3)) AND is_merged = FALSE LIMIT 1;`,
          [tenantId, aadhaarRaw, aadhaarRaw.length === 12 ? hashIdentifier(aadhaarRaw) : null]
        );
        if (aRes.rows.length > 0) {
          resolvedCustomerId = aRes.rows[0].customer_id;
        }
      }

      // 2. Secondary Match: Resolve by Phone Number ONLY IF customer name matches or no conflicting Aadhaar
      if (!resolvedCustomerId && mainPhone) {
        const phoneRes = await client.query(
          `SELECT c.customer_id, c.customer_name, c.aadhaar_number
           FROM customer_phones p
           JOIN customers c ON p.customer_id = c.customer_id
           WHERE p.tenant_id = $1 AND p.phone_number = $2 AND c.is_merged = FALSE LIMIT 1;`,
          [tenantId, mainPhone]
        );
        if (phoneRes.rows.length > 0) {
          const existing = phoneRes.rows[0];
          const existingName = (existing.customer_name || '').trim().toLowerCase();
          const currentName = name.trim().toLowerCase();

          if (existingName === currentName || !existing.aadhaar_number || !aadhaarRaw) {
            resolvedCustomerId = existing.customer_id;
          }
        }
      }

      // 3. If customer not found, auto-create customer in PostgreSQL with preferredId
      if (!resolvedCustomerId) {
        const phones = [mainPhone, altPhone].filter((p) => p && p.length >= 10);
        if (phones.length === 0) {
          phones.push(`999${Math.floor(1000000 + Math.random() * 9000000)}`); // Fallback unique placeholder phone
        }

        const ageVal = parseInt(row['CX Age'] || row['Age'] || '0', 10) || null;
        const addressVal = row['Address 1'] || row['Rental Address'] || row['Customer Address'] || null;
        const gstVal = row['GST Number'] || row['GST_Number'] || null;
        const nomineeVal = row['Nominee Name'] || null;
        const relationVal = row['Relation'] || null;
        const firmVal = row['Firm'] || row['Firm Name'] || null;
        const emailVal = row['Email'] || null;
        const branchName = row['Branch'] || row['Branch Name'] || null;
        const branchAddress = row['Branch Address'] || row['Branch Adress'] || null;
        const dmsInvoiceNo = row['DMS Invoice Number'] || null;
        const dmsInvoiceDate = row['DMS Invoice Date'] || null;
        const salesConsultant = row['Sales Consultant'] || null;

        const newCust = await CustomerService.createCustomer({
          name,
          email: emailVal,
          phone_numbers: [...new Set(phones)],
          opening_points: 0,
          aadhaar_number: aadhaarRaw.length === 12 ? aadhaarRaw : null,
          created_by: null,
          tenant_id: tenantId,
          explicit_customer_id: preferredId,
          award_auto_sales_points: true, // Auto sales points awarded for vehicle purchase sync
        });

        resolvedCustomerId = newCust.customer_id;

        // Update rich profile fields
        await client.query(
          `UPDATE customers
           SET age = $1, address = $2, gst_number = $3, nominee_name = $4, nominee_relation = $5, firm_name = $6, email = $7,
               branch_name = $8, branch_address = $9, dms_invoice_number = $10, dms_invoice_date = $11, sales_consultant = $12
           WHERE customer_id = $13 AND tenant_id = $14;`,
          [ageVal, addressVal, gstVal, nomineeVal, relationVal, firmVal, emailVal, branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, resolvedCustomerId, tenantId]
        );
      } else {

        // Update existing customer record with any missing profile details from AppSheet
        const ageVal = parseInt(row['CX Age'] || row['Age'] || '0', 10) || null;
        const addressVal = row['Address 1'] || row['Rental Address'] || row['Customer Address'] || null;
        const gstVal = row['GST Number'] || row['GST_Number'] || null;
        const nomineeVal = row['Nominee Name'] || null;
        const relationVal = row['Relation'] || null;
        const firmVal = row['Firm'] || row['Firm Name'] || null;
        const emailVal = row['Email'] || null;
        const branchName = row['Branch'] || row['Branch Name'] || null;
        const branchAddress = row['Branch Address'] || row['Branch Adress'] || null;
        const dmsInvoiceNo = row['DMS Invoice Number'] || null;
        const dmsInvoiceDate = row['DMS Invoice Date'] || null;
        const salesConsultant = row['Sales Consultant'] || null;

        await client.query(
          `UPDATE customers
           SET age = COALESCE(age, $1),
               address = COALESCE(address, $2),
               gst_number = COALESCE(gst_number, $3),
               nominee_name = COALESCE(nominee_name, $4),
               nominee_relation = COALESCE(nominee_relation, $5),
               firm_name = COALESCE(firm_name, $6),
               email = COALESCE(email, $7),
               branch_name = COALESCE(branch_name, $8),
               branch_address = COALESCE(branch_address, $9),
               dms_invoice_number = COALESCE(dms_invoice_number, $10),
               dms_invoice_date = COALESCE(dms_invoice_date, $11),
               sales_consultant = COALESCE(sales_consultant, $12)
           WHERE customer_id = $13 AND tenant_id = $14;`,
          [ageVal, addressVal, gstVal, nomineeVal, relationVal, firmVal, emailVal, branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, resolvedCustomerId, tenantId]
        );
      }

      return resolvedCustomerId;
    } finally {
      client.release();
    }
  }

  /**
   * Resolves or auto-creates vehicle linked to customer
   */
  static async resolveOrCreateVehicle(row, customerId, tenantId) {
    const vin = (row['VIN Number'] || row['VIN No'] || row['Chassis Number'] || '').trim();
    const regNo = (row['Reg Number'] || row['Registration Number'] || '').trim();
    const chassis = vin || regNo || row['Order Unique ID'] || 'CHASSIS-1';

    const model = (row['Model'] || row['Variant'] || 'Vehicle').trim();
    const variant = (row['Variant'] || row['Varient'] || '').trim();
    const brandName = (row['Brand'] || '').trim();
    const firmName = (row['Firm'] || row['Firm Name'] || '').trim();
    const branchName = (row['Branch'] || row['Branch Name'] || '').trim();
    const branchAddress = (row['Branch Address'] || row['Branch Adress'] || '').trim();
    const dmsInvoiceNo = (row['DMS Invoice Number'] || '').trim();
    const dmsInvoiceDate = (row['DMS Invoice Date'] || '').trim();
    const salesConsultant = (row['Sales Consultant'] || '').trim();
    const exShowroomPaise = Math.round(Number(row['Ex-Showroom Price'] || row['Net Ex-Showroom Price'] || row['Total Vehicle Billing Amount'] || 0) * 100);

    const client = await pool.connect();
    try {
      const vehRes = await client.query(
        `SELECT vehicle_id FROM vehicles WHERE tenant_id = $1 AND (chassis_no = $2 OR registration_number = $2) LIMIT 1;`,
        [tenantId, chassis]
      );

      if (vehRes.rows.length > 0) {
        return vehRes.rows[0].vehicle_id;
      }

      // Insert vehicle record with purchase_date set from dms_invoice_date
      const insRes = await client.query(
        `INSERT INTO vehicles (
           customer_id, chassis_no, vin, registration_number, model, variant, brand_name, firm_name,
           branch_name, branch_address, dms_invoice_number, dms_invoice_date, sales_consultant, ex_showroom_price,
           purchase_date, redemption_eligible_at, redemption_expires_at, tenant_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                 CASE WHEN $12::text IS NOT NULL AND $12::text != '' THEN $12::date ELSE NULL END,
                 CASE WHEN $12::text IS NOT NULL AND $12::text != '' THEN ($12::date + INTERVAL '12 months')::TIMESTAMPTZ ELSE NULL END,
                 CASE WHEN $12::text IS NOT NULL AND $12::text != '' THEN ($12::date + INTERVAL '24 months')::TIMESTAMPTZ ELSE NULL END,
                 $15)
         RETURNING vehicle_id;`,
        [customerId, chassis, vin || chassis, regNo, model, variant, brandName, firmName, branchName, branchAddress, dmsInvoiceNo, dmsInvoiceDate, salesConsultant, exShowroomPaise, tenantId]
      );

      return insRes.rows[0].vehicle_id;
    } finally {
      client.release();
    }
  }

  /**
   * Resolves branch_id from branch_code or branch_name
   */
  static async resolveBranchId(branchInput, tenantId) {
    if (!branchInput) return 1;
    const cleanBranch = String(branchInput).trim();

    const res = await pool.query(
      `SELECT branch_id FROM branches
       WHERE tenant_id = $1 AND (branch_id::text = $2 OR branch_name ILIKE $2 OR branch_city ILIKE $2)
       LIMIT 1;`,
      [tenantId, cleanBranch]
    );

    return res.rows[0]?.branch_id || 1;
  }

  /**
   * Executes a full AppSheet pull cycle for all configured tables
   */
  static async executePullCycle(tenantId = process.env.DEFAULT_TENANT_ID || 'bellad_and_company') {
    const tableNames = this.getTableNames();
    console.log(`\n📡 [AppSheetPull] Starting pull cycle for table(s): ${tableNames.join(', ')}`);

    const summary = {
      tablesProcessed: 0,
      totalFetched: 0,
      totalSynced: 0,
      totalSkipped: 0,
      totalErrored: 0,
    };

    for (const tableName of tableNames) {
      let fetchedCount = 0;
      let syncedCount = 0;
      let skippedCount = 0;
      let erroredCount = 0;
      const errorDetails = [];

      try {
        const rows = await this.fetchUnsyncedRows(tableName);
        fetchedCount = rows.length;
        console.log(`   📋 Table '${tableName}': Fetched ${fetchedCount} unsynced row(s).`);

        for (const row of rows) {
          const keyColumn = row['Order Unique ID'] ? 'Order Unique ID' : row['_RowNumber'] ? '_RowNumber' : 'Order Unique ID';
          const keyValue = row[keyColumn] || row['Order Unique ID'] || row['DMS Booking ID'];

          try {
            const billAmount = Number(row['Total Vehicle Billing Amount'] || row['Net Ex-Showroom Price'] || row['Ex-Showroom Price'] || 0);

            if (!billAmount || billAmount <= 0) {
              skippedCount++;
              continue;
            }

            // 1. Resolve / Auto-create customer
            const customerId = await this.resolveOrCreateCustomer(row, tenantId);

            // 2. Resolve / Auto-create vehicle
            const vehicleId = await this.resolveOrCreateVehicle(row, customerId, tenantId);

            // 3. Resolve branch
            const branchId = await this.resolveBranchId(row['Branch'] || row['branch_code'], tenantId);

            const refId = row['Order Unique ID'] || row['DMS Booking ID'] || row['DMS Invoice Number'];
            const jobCard = row['Order Unique ID'] || row['DMS Booking ID'];
            const category = (row['Department'] || '').toLowerCase() === 'service' ? 'service' : 'sale';

            // 4. Sync transaction idempotently via TransactionService
            const syncResult = await TransactionService.syncTransaction({
              category,
              job_card_number: jobCard,
              reference_id: refId,
              bill_amount: billAmount,
              customer_id: customerId,
              vehicle_id: vehicleId,
              registration_number: row['Reg Number'] || row['VIN Number'],
              branch_id: branchId,
              source: 'appsheet_bot',
              created_by: null,
              tenant_id: tenantId,
            });

            if (syncResult.status === 'already_processed') {
              skippedCount++;
            } else {
              syncedCount++;
            }

            // 4b. Automatic Referral Credit Path (Path A) if referred_by_code is set
            const referredByCode = (
              row['Referred By Code'] ||
              row['Referred By'] ||
              row['Referral Code'] ||
              row['Referred_By_Code'] ||
              ''
            ).trim();

            if (referredByCode) {
              try {
                const ReferralService = require('./referral.service');
                const buyerAadhaar = row['Aadhar Card No'] || row['Aadhaar Card No'] || '';
                
                // First check if this is a lead-generated code (e.g. RF8K92X1)
                const leadResult = await ReferralService.processLeadAtPurchase({
                  generated_code: referredByCode,
                  buyer_aadhaar,
                  sale_reference: refId,
                  tenant_id: tenantId,
                });

                if (leadResult) {
                  if (leadResult.matched) {
                    console.log(`      🎯 Referral Lead '${referredByCode}' matched buyer Aadhaar! Status set to 'used' (Awaiting RC completion for crediting).`);
                  } else {
                    console.warn(`      ⚠️ Referral Lead '${referredByCode}' Aadhaar MISMATCH! Flagged for admin review.`);
                  }
                } else {
                  // Fallback: Legacy direct customer referral code
                  await ReferralService.processReferralBonusForPurchase({
                    referral_code: referredByCode,
                    buyer_customer_id: customerId,
                    vehicle_id: vehicleId,
                    receipt_no: row['DMS Invoice Number'] || refId || null,
                    account_ledger_no: null,
                    branch_id: branchId,
                    cashier_id: null,
                    tenant_id: tenantId,
                  });
                  console.log(`      🎉 Auto-credited direct referral bonus for code '${referredByCode}' on vehicle ${vehicleId}`);
                }
              } catch (refErr) {
                console.warn(`      ⚠️ [Referral Auto-Credit Warning] Code '${referredByCode}':`, refErr.message || refErr);
              }
            }

            // 5. Update SyncedToLoyalty = true in AppSheet
            await this.markRowAsSyncedInAppSheet(tableName, keyColumn, keyValue);
          } catch (rowErr) {
            erroredCount++;
            errorDetails.push({ key: keyValue, error: rowErr.message || rowErr });
            console.error(`      ❌ Error syncing row '${keyValue}' from '${tableName}':`, rowErr.message || rowErr);
          }
        }
      } catch (tableErr) {
        console.error(`   ❌ Failed to pull rows from table '${tableName}':`, tableErr.message || tableErr);
        errorDetails.push({ table: tableName, fatalError: tableErr.message || tableErr });
      }

      // Log pull cycle results to appsheet_pull_log table
      try {
        await pool.query(
          `INSERT INTO appsheet_pull_log (table_name, rows_fetched, rows_synced, rows_skipped, rows_errored, details, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [tableName, fetchedCount, syncedCount, skippedCount, erroredCount, JSON.stringify(errorDetails), tenantId]
        );
      } catch (logErr) {
        console.error('[AppSheet Pull Logging Error]', logErr.message || logErr);
      }

      summary.tablesProcessed++;
      summary.totalFetched += fetchedCount;
      summary.totalSynced += syncedCount;
      summary.totalSkipped += skippedCount;
      summary.totalErrored += erroredCount;
    }

    console.log(`\n🏁 [AppSheetPull] Pull cycle completed.`);
    console.log(`   • Fetched : ${summary.totalFetched}`);
    console.log(`   • Synced  : ${summary.totalSynced}`);
    console.log(`   • Skipped : ${summary.totalSkipped}`);
    console.log(`   • Errored : ${summary.totalErrored}\n`);

    return summary;
  }
}

module.exports = AppSheetPullService;
