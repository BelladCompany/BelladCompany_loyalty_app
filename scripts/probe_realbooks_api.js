const https = require('https');

const domain = 'bellad group';
const accessKey = 'BLGQ30912BX512LDJLLSKDF7921543P';
const secretKey = 'BLGQ30912BX512LDJLLSKDF7921543P';
const email = 'accounts@bellad.in';

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(`https://api.realbooks.in${path}`);
    const req = https.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'accountName': domain,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data.slice(0, 300) });
        }
      });
    });
    req.on('error', err => resolve({ error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Testing RealBooks API for segments and companies...\n');

  // Let's test segment list endpoints
  const endpoints = [
    '/AMSSERVICE/api/segment/list/6460',
    '/AMSSERVICE/api/segments/6460',
    '/AMSSERVICE/api/company/segment/6460',
    '/AMSSERVICE/api/company/list',
    '/AMSSERVICE/api/segment/getsegments/6460',
    '/AMSSERVICE/api/ledger/segments/6460',
  ];

  for (const ep of endpoints) {
    const res = await testEndpoint(ep, 'POST', { accessKey, secretKey, emailid: email });
    console.log(`Endpoint: ${ep} => Status: ${res.status}, Result:`, JSON.stringify(res.data || res.raw || res.error).slice(0, 200));
  }

  process.exit(0);
}

run();
