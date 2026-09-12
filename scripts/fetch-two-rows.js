// scripts/fetch-two-rows.js
require('dotenv').config();
const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';

async function testFetch() {
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
      Selector: "Filter(VIN order form, Or(Contains([Customer Name], 'NEETA'), Contains([Customer Name], 'Nagarathnamma')))",
    }),
  });

  const rows = await response.json();
  console.log('AppSheet Filtered Rows:', rows);
}

testFetch();
