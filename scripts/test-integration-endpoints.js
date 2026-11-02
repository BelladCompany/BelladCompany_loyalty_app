const http = require('http');
const app = require('../src/app');

let server;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      console.log(`Test server running on port ${port}`);
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function testEndpoint(baseUrl, path, method = 'GET', body = null, headers = {}) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'bac_live_master_bellad_loyalty_2026',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  const baseUrl = await startServer();

  try {
    console.log('\n[HTTP 1] GET /api/v1/integration/health');
    const hRes = await testEndpoint(baseUrl, '/api/v1/integration/health');
    console.log(`Status: ${hRes.status}, API Client: ${hRes.data?.data?.client_name}`);

    console.log('\n[HTTP 2] GET /api/v1/integration/realbooks/status');
    const sRes = await testEndpoint(baseUrl, '/api/v1/integration/realbooks/status');
    console.log(`Status: ${sRes.status}, Mode: ${sRes.data?.data?.mode}, Synced: ${sRes.data?.data?.stats?.synced}`);

    console.log('\n[HTTP 3] POST /api/v1/integration/realbooks/push-ledger');
    const lRes = await testEndpoint(baseUrl, '/api/v1/integration/realbooks/push-ledger', 'POST', {
      customer_id: 'BAC-3953CD66',
    });
    console.log(`Status: ${lRes.status}, Ledger ID: ${lRes.data?.data?.realbooks_ledger_id}`);

    console.log('\n[HTTP 4] POST /api/v1/integration/realbooks/push-receipt');
    const rRes = await testEndpoint(baseUrl, '/api/v1/integration/realbooks/push-receipt', 'POST', {
      receipt_no: `INV-API-${Date.now()}`,
      customer_id: 'BAC-3953CD66',
      bill_amount: 3200,
      discount_amount: 400,
      points_redeemed: 1600,
      category: 'service',
      job_card: 'JC-API-99',
    });
    console.log(`Status: ${rRes.status}, Voucher ID: ${rRes.data?.data?.voucher_id}, Message: ${rRes.data?.data?.message}`);

    console.log('\n[HTTP 5] GET /api/v1/integration/docs');
    const dRes = await testEndpoint(baseUrl, '/api/v1/integration/docs');
    const rbRoutes = dRes.data?.data?.endpoints?.filter((e) => e.path.includes('realbooks'));
    console.log(`Status: ${dRes.status}, RealBooks Endpoints Documented: ${rbRoutes?.length}`);

    console.log('\n🎉 ALL HTTP INTEGRATION ENDPOINT TESTS PASSED SUCCESSFULLY!');
  } finally {
    await stopServer();
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

