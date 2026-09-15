require('dotenv').config();
const https = require('https');

const apiUrl = process.env.RELTIGROW_API_URL;
const apiKey = process.env.RELTIGROW_API_KEY;
const origin = new URL(apiUrl);

const options = {
  hostname: origin.hostname,
  port: origin.port || (origin.protocol === 'https:' ? 443 : 80),
  path: '/api/v2/templates',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
  },
};

const req = https.request(options, (res) => {
  let raw = '';
  res.on('data', (c) => (raw += c));
  res.on('end', () => {
    console.log(`HTTP ${res.statusCode}`);
    try {
      const body = JSON.parse(raw);
      const templates = body.data || [];
      console.log(`\nTotal templates: ${templates.length}\n`);
      for (const t of templates) {
        console.log(`- "${t.template_name}" | lang=${t.language} | cat=${t.category} | status=${t.status} | body_params_count=${t.body_params_count} | header_params_count=${t.header_params_count}`);
      }
    } catch (e) {
      console.log(raw.slice(0, 4000));
    }
  });
});
req.on('error', (err) => console.error('NETWORK_ERR:', err.message));
req.end();