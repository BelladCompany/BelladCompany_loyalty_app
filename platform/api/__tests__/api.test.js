require('dotenv').config();
const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('../../../src/app');
const env = require('../../../src/config/env');

async function runApiIntegrationTests() {
  console.log('🧪 Running Platform REST API & Real-Time Publish Test Suite...\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const token = jwt.sign(
    { userId: 1, username: 'director_test', role: 'admin', tenant_id: 'bellad_and_company' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-tenant-id': 'bellad_and_company',
  };

  try {
    // TEST 1: GET Active Published Ruleset
    console.log('Test 1: GET /api/v1/platform/rules/active');
    const resActive = await fetch(`${baseUrl}/api/v1/platform/rules/active?tenant_id=bellad_and_company`);
    assert.strictEqual(resActive.status, 200);
    const dataActive = await resActive.json();
    assert.strictEqual(dataActive.status, 'success');
    assert.ok(dataActive.data.version_number >= 1);
    assert.ok(resActive.headers.get('etag'));
    console.log(`  ✅ Active ruleset returned Version ${dataActive.data.version_number} (ETag: ${resActive.headers.get('etag')}).`);

    // TEST 2: GET Branding Config
    console.log('\nTest 2: GET /api/v1/platform/rules/branding');
    const resBrand = await fetch(`${baseUrl}/api/v1/platform/rules/branding?tenant_id=bellad_and_company`);
    assert.strictEqual(resBrand.status, 200);
    const dataBrand = await resBrand.json();
    assert.strictEqual(dataBrand.status, 'success');
    assert.strictEqual(dataBrand.data.portal_title, 'Bellad & Company Group Loyalty');
    console.log(`  ✅ Branding returned: "${dataBrand.data.portal_title}" (Accent: ${dataBrand.data.accent_color}).`);

    // TEST 3: POST Simulation Sandbox
    console.log('\nTest 3: POST /api/v1/platform/rules/simulate');
    const resSim = await fetch(`${baseUrl}/api/v1/platform/rules/simulate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customer_profile: { current_tier: 'Gold' },
        transaction_context: {
          event_type: 'service',
          spend_amount: 15000,
          branch_name: 'Hubli',
        },
      }),
    });
    assert.strictEqual(resSim.status, 200);
    const dataSim = await resSim.json();
    assert.strictEqual(dataSim.status, 'success');
    assert.strictEqual(dataSim.data.summary.total_points_earned, 600); // ₹15,000 * 4% = 600 pts
    console.log(`  ✅ Simulator HTTP test passed: 600 points evaluated in ${dataSim.data.execution_ms}ms.`);

    // TEST 4: POST Save Draft Version
    console.log('\nTest 4: POST /api/v1/platform/rules/draft');
    const modifiedRuleset = JSON.parse(JSON.stringify(dataActive.data.ruleset));
    modifiedRuleset.rules.push({
      rule_id: 'test_temporary_special',
      rule_name: 'Test Temporary Promotional Drive',
      priority_weight: 400,
      event_type: 'service',
      is_active: true,
      conditions: { vehicle_types: ['ALL'], brands: ['ALL'], branches: ['ALL'], customer_tiers: ['ALL'] },
      action: {
        discount: { type: 'percentage', value: 15, max_cap_paise: 300000, deduct_from_points_base: true },
        points_earning: { formula_basis: 'bill_amount', multiplier_numerator: 5, multiplier_denominator: 100, bonus_points: 100 },
      },
    });

    const resDraft = await fetch(`${baseUrl}/api/v1/platform/rules/draft`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ruleset: modifiedRuleset,
        release_notes: 'Adding temporary promotional service drive',
      }),
    });
    assert.strictEqual(resDraft.status, 200);
    const dataDraft = await resDraft.json();
    assert.strictEqual(dataDraft.status, 'success');
    const draftVersionNumber = dataDraft.data.version_number;
    console.log(`  ✅ Draft Version ${draftVersionNumber} saved with status '${dataDraft.data.status}'.`);

    // TEST 5: POST Publish Draft Version
    console.log(`\nTest 5: POST /api/v1/platform/rules/publish (Publishing Version ${draftVersionNumber})`);
    const resPublish = await fetch(`${baseUrl}/api/v1/platform/rules/publish`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ version_number: draftVersionNumber }),
    });
    assert.strictEqual(resPublish.status, 200);
    const dataPublish = await resPublish.json();
    assert.strictEqual(dataPublish.status, 'success');
    assert.strictEqual(dataPublish.data.status, 'published');
    assert.strictEqual(dataPublish.data.is_active, true);
    console.log(`  ✅ Version ${draftVersionNumber} successfully published live!`);

    // Verify GET active returns newly published version
    const resActiveAfterPublish = await fetch(`${baseUrl}/api/v1/platform/rules/active?tenant_id=bellad_and_company`);
    const dataActiveAfterPublish = await resActiveAfterPublish.json();
    assert.strictEqual(dataActiveAfterPublish.data.version_number, draftVersionNumber);
    console.log(`  ✅ Cache invalidated immediately; active endpoint returns v${draftVersionNumber}.`);

    // TEST 6: POST One-Click Rollback
    console.log('\nTest 6: POST /api/v1/platform/rules/rollback (Rolling back to Version 1 baseline)');
    const resRollback = await fetch(`${baseUrl}/api/v1/platform/rules/rollback`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ target_version_number: 1 }),
    });
    assert.strictEqual(resRollback.status, 200);
    const dataRollback = await resRollback.json();
    assert.strictEqual(dataRollback.status, 'success');
    const rolledBackVersionNum = dataRollback.data.version_number;
    console.log(`  ✅ One-click rollback completed! Version 1 ruleset published as new Version ${rolledBackVersionNum}.`);

    // Verify GET active now reflects the clean baseline
    const resActiveRollback = await fetch(`${baseUrl}/api/v1/platform/rules/active?tenant_id=bellad_and_company`);
    const dataActiveRollback = await resActiveRollback.json();
    assert.strictEqual(dataActiveRollback.data.version_number, rolledBackVersionNum);
    console.log(`  ✅ Live cache confirmed restored to baseline ruleset.`);

    console.log('\n🎉 ALL PLATFORM REST API & REAL-TIME PUBLISH TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ API Integration Test Failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runApiIntegrationTests();
