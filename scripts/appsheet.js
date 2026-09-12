// scripts/appsheet.js
// ---------------------------------------------------------------------------
// Fetches rows directly from AppSheet's cloud API for Vehicle Billing Dashboard.
// Filters ONLY customers who have completed PR (where Billing Status = 'PR Done' 
// or PR Done timestamp/details are present).
//
// Usage:
//   node scripts/appsheet.js              (fetches PR Done customer details)
// ---------------------------------------------------------------------------

require('dotenv').config(); // loads .env from project root

const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';
// Use VIN order form as primary vehicle billing table
const TABLE_NAME = process.env.APPSHEET_TABLE_NAME || 'VIN order form';

async function fetchAppSheetPRDoneRows() {
  if (
    !APPSHEET_APP_ID || APPSHEET_APP_ID === 'YOUR_APP_ID' ||
    !APPSHEET_ACCESS_KEY || APPSHEET_ACCESS_KEY === 'YOUR_ACCESS_KEY'
  ) {
    console.error('\n❌  Configuration missing!');
    console.error('    Please check your .env file for APPSHEET_APP_ID & APPSHEET_ACCESS_KEY.\n');
    process.exit(1);
  }

  // Attempt to fetch from primary table, e.g. "VIN order form"
  let targetTable = TABLE_NAME;
  if (targetTable === 'Tally Billing Master') {
    targetTable = 'VIN order form';
  }

  const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(targetTable)}/Action`;

  console.log(`\n📡  Calling AppSheet API (Vehicle Billing Dashboard)...`);
  console.log(`    App ID    : ${APPSHEET_APP_ID}`);
  console.log(`    Table     : ${targetTable}`);

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
      },
      Rows: [],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AppSheet API error ${response.status}: ${errText}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

/**
 * Normalizes and extracts key customer & billing details from an AppSheet PR Done row
 */
function extractCustomerPrDetails(row) {
  return {
    order_unique_id: row['Order Unique ID'] || '',
    customer_name: row['Customer Name'] || row['Customer Ledger Name'] || '',
    customer_phone: row['Customer Number'] || row['Customer Alt Number'] || '',
    billing_status: row['Billing Status'] || '',
    dms_invoice_number: row['DMS Invoice Number'] || '',
    dms_invoice_date: row['DMS Invoice Date'] || '',
    vin_number: row['VIN Number'] || '',
    reg_number: row['Reg Number'] || '',
    brand: row['Brand'] || '',
    branch: row['Branch'] || '',
    total_billing_amount: row['Total Vehicle Billing Amount'] || row['Net Ex-Showroom Price'] || row['Ex-Showroom Price'] || '0',
    upload_date_time: row['Upload Date Time'] || '',
    sales_consultant: row['Sales Consultant'] || '',
    pr_timestamp: row['DMS Invoice Date'] || row['Customer Details Timestamp'] || row['Price Submit Timestamp'] || '',
  };
}

async function main() {
  try {
    const allRows = await fetchAppSheetPRDoneRows();

    // Filter specifically for rows where PR is completed (Billing Status = 'PR Done' or contains 'PR')
    const prDoneRows = allRows.filter((r) => {
      const billingStatus = String(r['Billing Status'] || '').trim().toLowerCase();
      const orderStatus = String(r['Order Form Status'] || '').trim().toLowerCase();
      const status = String(r['Status'] || '').trim().toLowerCase();

      return (
        billingStatus === 'pr done' ||
        billingStatus.includes('pr done') ||
        billingStatus.includes('pr') ||
        status.includes('pr done') ||
        orderStatus.includes('pr done')
      );
    });

    if (prDoneRows.length === 0) {
      console.log('\n⚠️  No customer details found with PR Done status out of ' + allRows.length + ' total rows.');
      return;
    }

    console.log(`\n=============================================================`);
    console.log(`  PR DONE CUSTOMER DETAILS FETCHED FROM APPSHEET (${prDoneRows.length} Found out of ${allRows.length} Total)`);
    console.log(`=============================================================\n`);

    const extractedCustomers = prDoneRows.map(extractCustomerPrDetails);

    // Display sample PR Done customer records
    console.log(`--- Sample PR Done Customer Records (First ${Math.min(5, extractedCustomers.length)} of ${extractedCustomers.length}) ---`);
    console.log(JSON.stringify(extractedCustomers.slice(0, 5), null, 2));

    console.log(`\n✅  Summary: Successfully fetched ${extractedCustomers.length} PR Done customer details from AppSheet.`);
  } catch (err) {
    console.error('\n❌  Failed to fetch PR Done customer details from AppSheet:', err.message);
    process.exit(1);
  }
}

main();



