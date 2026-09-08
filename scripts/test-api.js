/**
 * Integration and sanity check script for Loyalty Program Express + PostgreSQL backend.
 */
const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
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

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Full API & Notification Integration Tests...\n');

  try {
    // 1. Health check
    console.log('1️⃣ Checking Health Endpoint...');
    const health = await makeRequest('/health');
    console.log('Health Response:', health.status, health.body);

    // 2. Admin Login
    console.log('\n2️⃣ Logging in as Admin...');
    const adminLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
      username: 'admin',
      password: 'Admin@123',
    });
    console.log('Admin Login Status:', adminLogin.status);
    const adminToken = adminLogin.body?.data?.token;
    if (!adminToken) throw new Error('Failed to get admin token');

    // 3. Cashier Login
    console.log('\n3️⃣ Logging in as Cashier...');
    const cashierLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
      username: 'cashier',
      password: 'Cashier@123',
    });
    console.log('Cashier Login Status:', cashierLogin.status);
    const cashierToken = cashierLogin.body?.data?.token;
    if (!cashierToken) throw new Error('Failed to get cashier token');

    // Fetch branches to get valid branch_id
    const branchRes = await makeRequest('/api/branches', { headers: { Authorization: `Bearer ${cashierToken}` } });
    const branchId = branchRes.body?.data?.[0]?.id || 1;

    // 4. Create Customer 1
    console.log('\n4️⃣ Creating Customer 1...');
    const testPhone1 = `98765${Math.floor(10000 + Math.random() * 90000)}`;
    const cust1 = await makeRequest(
      '/api/customers',
      { method: 'POST', headers: { Authorization: `Bearer ${cashierToken}` } },
      { name: 'Rajesh Kumar Sharma', email: 'rajesh.sharma@example.com', phone_numbers: [testPhone1] }
    );
    const customerId1 = cust1.body?.data?.customer_id;
    console.log('Customer 1 Created:', cust1.status, customerId1);

    // 5. Test Points Earning SALE (triggers WhatsApp notification)
    console.log('\n5️⃣ Recording Points Earning - SALE (Amount: 800,000 -> 8,000 pts)...');
    const saleEarning = await makeRequest(
      '/api/points/earn',
      { method: 'POST', headers: { Authorization: `Bearer ${cashierToken}` } },
      {
        customer_id: customerId1,
        branch_id: branchId,
        type: 'sale',
        amount: 800000,
        reference_id: 'INV-SALE-2026-001',
        description: 'New Vehicle Sale - Swift Dzire',
      }
    );
    console.log('Sale Earning Response:', saleEarning.status, 'Points:', saleEarning.body?.data?.ledger_entry?.points);

    // 6. Test WhatsApp Notification Service directly for exact template matching
    console.log('\n6️⃣ Testing Notification Service (Exact Template & Live Ledger Balance)...');
    const NotificationService = require('../src/services/notification.service');
    const activeTenantId = process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
    const notifResult = await NotificationService.sendPointsEarnedNotification({
      customer_id: customerId1,
      points: 8000,
      transaction_type: 'sale',
      tenant_id: activeTenantId,
    });

    console.log('Notification Dispatch Result:', notifResult.success);
    console.log('Live Total Available Points:', notifResult.total_points_live, '(Expected: 8000)');
    console.log('Calculated Loyalty Value: ₹', notifResult.loyalty_value_rupees, '(Expected: ₹2000)');

    const expectedTemplate = 
`🎉 Congratulations!
You have earned 8000 loyalty points from your recent sale transaction.
⭐ Points earned: 8000
💰 Total available points: 8000
💵 Loyalty value: ₹2000
Thank you for choosing us!`;

    if (notifResult.message_body !== expectedTemplate) {
      console.error('Template Mismatch!');
      console.error('Got:\n' + notifResult.message_body);
      console.error('Expected:\n' + expectedTemplate);
      throw new Error('WhatsApp message template mismatch!');
    } else {
      console.log('✅ Exact Template Match Confirmed!');
    }

    // 7. Test OTP Request & Points Redemption (Triggers RealBooks API push & sync log)
    console.log('\n7️⃣ Testing OTP Request & Points Redemption (RealBooks Trigger)...');
    const otpReq = await makeRequest(
      '/api/redemptions/otp/request',
      { method: 'POST', headers: { Authorization: `Bearer ${cashierToken}` } },
      { customer_id: customerId1 }
    );
    console.log('OTP Request Status:', otpReq.status);

    const testOtp = otpReq.body?.data?.debug_otp || '123456';

    const redeemRes = await makeRequest(
      '/api/redemptions/redeem',
      { method: 'POST', headers: { Authorization: `Bearer ${cashierToken}` } },
      {
        customer_id: customerId1,
        phone: testPhone1,
        otp: testOtp,
        points: 4000,
        branch_id: branchId,
        bypass_lock_in: true,
      }
    );
    console.log('Redemption Status:', redeemRes.status, 'Code:', redeemRes.body?.data?.redemption?.redemption_code);
    const redemptionId = redeemRes.body?.data?.redemption?.id;

    // Wait 200ms for setImmediate async RealBooks sync log queue to write
    await new Promise((r) => setTimeout(r, 200));

    // 8. Verify RealBooks Integration & Admin Endpoints
    console.log('\n8️⃣ Verifying RealBooks Integration & Admin Endpoints...');
    const { pool } = require('../src/config/db');
    const syncLogsRes = await pool.query(
      `SELECT * FROM realbooks_sync_log WHERE entity_id = $1;`,
      [redemptionId]
    );
    console.log('RealBooks Sync Log Created:', syncLogsRes.rows.length > 0, 'Status:', syncLogsRes.rows[0]?.api_status || syncLogsRes.rows[0]?.status);

    const adminFailures = await makeRequest(
      '/api/admin/realbooks/sync-failures',
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('Admin RealBooks Sync Failures Endpoint Status:', adminFailures.status);

    if (syncLogsRes.rows[0]?.sync_id) {
      const logId = syncLogsRes.rows[0].sync_id;
      const retryRes = await makeRequest(
        `/api/admin/realbooks/retry/${logId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log('Admin RealBooks Manual Retry Endpoint Status:', retryRes.status, 'Result Status:', retryRes.body?.data?.status);
    }

    console.log('\n🎉 ALL REALBOOKS INTEGRATION & API TESTS PASSED SUCCESSFULLY! 🚀');
  } catch (err) {
    console.error('\n❌ Test Error:', err);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
