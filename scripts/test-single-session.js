const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runSessionTest() {
  console.log('🧪 Starting Single Active Session Concurrency Test...');

  // 1. Log in from Browser A
  console.log('\n1️⃣ Simulating Login from Browser A (admin / Admin@123)...');
  const loginA = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { username: 'admin', password: 'Admin@123' });

  if (loginA.status !== 200 || !loginA.body?.data?.token) {
    console.error('❌ Login A failed:', loginA);
    process.exit(1);
  }
  const tokenA = loginA.body.data.token;
  const sessionIdA = loginA.body.data.user.sessionId;
  console.log(`✅ Session A established! (sessionId: ${sessionIdA})`);

  // 2. Validate Session A is active
  console.log('\n2️⃣ Testing session validation for Browser A...');
  const validateA = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/validate-session',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'x-tenant-id': 'bellad_and_company',
    },
  });
  console.log(`Browser A validate response (HTTP ${validateA.status}):`, validateA.body);
  if (validateA.status !== 200 || !validateA.body?.data?.valid) {
    console.error('❌ Session A validation failed unexpectedly!');
    process.exit(1);
  }

  // 3. Log in from Browser B with same credentials
  console.log('\n3️⃣ Simulating Login from Browser B with same credentials (admin / Admin@123)...');
  const loginB = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { username: 'admin', password: 'Admin@123' });

  if (loginB.status !== 200 || !loginB.body?.data?.token) {
    console.error('❌ Login B failed:', loginB);
    process.exit(1);
  }
  const tokenB = loginB.body.data.token;
  const sessionIdB = loginB.body.data.user.sessionId;
  const supersededNotice = loginB.body.data.supersededPreviousSession;
  console.log(`✅ Session B established! (sessionId: ${sessionIdB}, supersededPreviousSession: ${supersededNotice})`);

  if (sessionIdA === sessionIdB) {
    console.error('❌ Expected distinct session IDs for new login!');
    process.exit(1);
  }

  // 4. Validate Session B is active
  console.log('\n4️⃣ Testing session validation for Browser B...');
  const validateB = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/validate-session',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenB}`,
      'x-tenant-id': 'bellad_and_company',
    },
  });
  console.log(`Browser B validate response (HTTP ${validateB.status}):`, validateB.body);
  if (validateB.status !== 200) {
    console.error('❌ Session B validation failed!');
    process.exit(1);
  }

  // 5. Test Browser A (the old session) — MUST be rejected with HTTP 401 & SESSION_SUPERSEDED
  console.log('\n5️⃣ Testing Browser A (Old Session) request — MUST BE REJECTED...');
  const oldSessionCheck = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/validate-session',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'x-tenant-id': 'bellad_and_company',
    },
  });

  console.log(`Old Session check response (HTTP ${oldSessionCheck.status}):`, oldSessionCheck.body);

  if (oldSessionCheck.status === 401 && oldSessionCheck.body?.code === 'SESSION_SUPERSEDED') {
    console.log('\n🎉 SUCCESS! Old session was immediately superseded and blocked!');
    console.log(`Rejection Code: ${oldSessionCheck.body.code}`);
    console.log(`Message: ${oldSessionCheck.body.error}`);
  } else {
    console.error('❌ Single session enforcement failed to block old session!', oldSessionCheck);
    process.exit(1);
  }

  // 6. Test protected business endpoint (e.g. GET /api/auth/me) with old session
  console.log('\n6️⃣ Testing protected endpoint /api/auth/me with Browser A old token...');
  const meCheck = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'x-tenant-id': 'bellad_and_company',
    },
  });

  console.log(`Protected endpoint response (HTTP ${meCheck.status}):`, meCheck.body);
  if (meCheck.status === 401 && meCheck.body?.code === 'SESSION_SUPERSEDED') {
    console.log('✅ Protected endpoint correctly rejected superseded token with HTTP 401 SESSION_SUPERSEDED!');
  } else {
    console.error('❌ Protected endpoint failed to reject old token!', meCheck);
    process.exit(1);
  }

  console.log('\n✨ ALL SINGLE-SESSION ENFORCEMENT VERIFICATIONS PASSED 100%!');
  process.exit(0);
}

runSessionTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
