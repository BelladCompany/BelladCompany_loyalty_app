// scripts/find-row-for-vin.js
require('dotenv').config();
const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';

async function findVinRow() {
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
      Selector: "Filter(VIN order form, Contains([VIN Number], 'MYHABFCB7TBF06740'))",
    }),
  });

  const rows = await response.json();
  console.log('AppSheet Row for MYHABFCB7TBF06740:');
  rows.forEach(r => {
    console.log({
      _RowNumber: r['_RowNumber'],
      'Order Unique ID': r['Order Unique ID'],
      'DMS Booking ID': r['DMS Booking ID'],
      'Customer Name': r['Customer Name'],
      'Customer Number': r['Customer Number'],
      'Customer Alt Number': r['Customer Alt Number'],
      'Aadhar Card No': r['Aadhar Card No'],
      'VIN Number': r['VIN Number'],
      'Billing Status': r['Billing Status'],
    });
  });
}

findVinRow();
