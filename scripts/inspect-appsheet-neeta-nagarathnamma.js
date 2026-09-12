// scripts/inspect-appsheet-neeta-nagarathnamma.js
const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';

async function fetchAppSheetRows() {
  const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/VIN order form/Action`;

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

  const rows = await response.json();
  console.log(`Total AppSheet rows returned: ${rows.length}`);

  const matches = rows.filter(r => {
    const str = JSON.stringify(r).toLowerCase();
    return str.includes('neeta') || str.includes('nagarathnamma') || str.includes('myhabfcb7tbf06740') || str.includes('test vin 123456');
  });

  console.log('\n--- MATCHING APPSHEET ROWS ---');
  matches.forEach((r, idx) => {
    console.log(`\nRow #${idx + 1}:`);
    console.log({
      RowNumber: r['_RowNumber'],
      OrderUniqueID: r['Order Unique ID'],
      DMSBookingID: r['DMS Booking ID'],
      CustomerName: r['Customer Name'] || r['Customer Ledger Name'],
      CustomerNumber: r['Customer Number'],
      CustomerAltNumber: r['Customer Alt Number'],
      AadharCardNo: r['Aadhar Card No'] || r['Aadhaar Card No'],
      VINNumber: r['VIN Number'] || r['VIN No'] || r['Chassis Number'],
      Model: r['Model'],
      PRStatus: r['PR Status'] || r['PR Completed'],
    });
  });
}

fetchAppSheetRows();
