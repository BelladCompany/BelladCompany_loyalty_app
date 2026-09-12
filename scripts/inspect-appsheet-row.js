require('dotenv').config();

const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';
const TABLE_NAME = process.env.APPSHEET_TABLE_NAME || 'VIN order form';

async function inspectAppSheetRow() {
  const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(TABLE_NAME)}/Action`;

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
  if (Array.isArray(rows) && rows.length > 0) {
    console.log('=== APPSHEET TABLE COLUMNS ===');
    console.log(Object.keys(rows[0]));

    console.log('\n=== SAMPLE ROW SAMPLE VALUES ===');
    const row = rows.find(r => r['Aadhar Card No'] || r['Aadhaar Card No'] || r['Fuel Type'] || r['Fuel']);
    if (row) {
      console.log('Aadhar Card No:', row['Aadhar Card No'] || row['Aadhaar Card No']);
      console.log('Fuel Type:', row['Fuel Type'] || row['Fuel'] || row['Engine Type']);
      console.log('Customer Name:', row['Customer Name']);
      console.log('Reg Number:', row['Reg Number']);
      console.log('VIN Number:', row['VIN Number']);
    } else {
      console.log('Sample row 0:', JSON.stringify(rows[0], null, 2));
    }
  }
}

inspectAppSheetRow().catch(console.error);
