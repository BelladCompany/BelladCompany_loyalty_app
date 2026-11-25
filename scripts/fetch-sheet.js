const https = require('https');
const fs = require('fs');

const docId = '16OBMMk5ygmr8btNj0qWGbG-0PUBV0KIuO4xag6HGqAw';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  try {
    // 1. Fetch HTML view
    const html = await fetchUrl(`https://docs.google.com/spreadsheets/d/${docId}/htmlview`);
    fs.writeFileSync('scripts/sheet_preview.html', html);
    console.log('Fetched HTML view, length:', html.length);

    // 2. Try fetching CSV of first sheet (gid=0)
    const csv0 = await fetchUrl(`https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=0`);
    fs.writeFileSync('scripts/sheet_0.csv', csv0);
    console.log('Fetched CSV 0, length:', csv0.length);

    // Look for other sheet gids inside HTML
    const gidMatches = [...html.matchAll(/gid=([0-9]+)/g)].map(m => m[1]);
    const uniqueGids = Array.from(new Set(gidMatches));
    console.log('Found GIDs:', uniqueGids);

    for (const gid of uniqueGids) {
      if (gid !== '0') {
        const csv = await fetchUrl(`https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`);
        fs.writeFileSync(`scripts/sheet_${gid}.csv`, csv);
        console.log(`Fetched CSV gid=${gid}, length:`, csv.length);
      }
    }
  } catch(e) {
    console.error('Error fetching sheet:', e);
  }
}

run();
