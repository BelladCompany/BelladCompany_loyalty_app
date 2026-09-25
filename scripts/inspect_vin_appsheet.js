require('dotenv').config();

const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';
const TABLE_NAME = process.env.APPSHEET_TABLE_NAME || 'VIN order form';

async function main() {
  const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(TABLE_NAME)}/Action`;
  console.log(`Fetching from ${url}...`);

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
    console.error('AppSheet Error:', response.status, await response.text());
    return;
  }

  const rows = await response.json();
  console.log(`Total rows fetched: ${rows.length}`);

  const match = rows.find((r) => {
    const vin = String(r['VIN Number'] || r['VIN No'] || r['Chassis Number'] || r['Chassis No'] || r['_RowNumber'] || '');
    const reg = String(r['Reg Number'] || r['Registration Number'] || r['Reg No'] || '');
    return vin.includes('MAT634169TPFA5334') || reg.includes('KA51NA7534');
  });

  if (!match) {
    console.log('No matching VIN/Reg row found by exact string search. Let us search all keys/values across all rows for 166,865 or 5334 or 7534:');
    const fuzzyMatch = rows.find((r) => JSON.stringify(r).includes('5334') || JSON.stringify(r).includes('7534') || JSON.stringify(r).includes('166865') || JSON.stringify(r).includes('166,865'));
    if (fuzzyMatch) {
      console.log('\n--- FUZZY MATCHED RECORD ---');
      for (const [key, val] of Object.entries(fuzzyMatch)) {
        if (val !== null && val !== '' && val !== undefined) {
          console.log(`${key}: ${JSON.stringify(val)}`);
        }
      }
    } else {
      console.log('No fuzzy match found either. Sample keys of first row:');
      if (rows[0]) console.log(Object.keys(rows[0]));
    }
    return;
  }

  console.log('\n--- MATCHED RECORD FOR MAT634169TPFA5334 ---');
  for (const [key, val] of Object.entries(match)) {
    if (val !== null && val !== '' && val !== undefined) {
      console.log(`${key}: ${JSON.stringify(val)}`);
    }
  }
}

main().catch((err) => console.error(err));
