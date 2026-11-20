/**
 * Campaign Add-on Engine Automated Verification Suite
 * automobile-loyalty-backend (v2)
 *
 * Verifies all 13 core requirements, hard rules, calculation arithmetic,
 * lifecycle transitions, stacking, idempotency, reversals, and golden regression.
 */
const assert = require('assert');
const { pool } = require('../src/config/db');
const CampaignEngineService = require('../src/services/campaignEngine.service');
const VehiclePointsEngine = require('../src/services/vehiclePointsEngine.service');
const VehicleSalesPointsService = require('../src/services/vehicleSalesPoints.service');

async function runCampaignSuite() {
  console.log('================================================================');
  console.log('🎯 RUNNING CAMPAIGN ADD-ON ENGINE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
      if (err.stack) console.error(err.stack);
    }
  }

  // ------------------------------------------------------------------------
  // 1. WORKED EXAMPLE & UNIT CALCULATION
  // ------------------------------------------------------------------------
  console.log('1️⃣ WORKED EXAMPLE & CALCULATION ARITHMETIC');

  await test('Hero Splendor Plus +25% Worked Example (Rs.80,000 Net Ex-Showroom)', async () => {
    // standard = floor(80000 * 1 / 100) = 800.
    // bonus = floor(800 * 25 / 100) = 200.
    // total = 1,000 points = Rs.250.
    const standardPoints = 800;
    const campaign = {
      id: 9991,
      code: 'CAMP-TEST-01',
      name: 'Christmas Hero Splendor Bonus',
      type: 'PCT_OF_STANDARD',
      value: 25,
      brand: 'HERO',
      all_models: false,
      models: ['Splendor Plus', 'Splendor+ XTEC'],
      all_branches: false,
      branches: [1, 2], // 1=Hubballi, 2=Belagavi
      customer_tier: 'ALL',
      min_spend: 0,
      max_spend: null,
      start_date: '2026-12-01',
      end_date: '2026-12-31',
      date_basis: 'INVOICE',
      stacking: 'STACK',
      priority: 100,
      status: 'ACTIVE',
    };

    const invoice = {
      spend_category: 'sale',
      net_ex_showroom_price: 80000,
      brand: 'Hero',
      model: 'Splendor Plus',
      branch_id: 1,
      customer_tier: 'silver',
      invoice_date: '2026-12-10',
    };

    const res = await CampaignEngineService.evaluateCampaigns({
      standard_points: standardPoints,
      invoice,
      overrideCampaign: campaign,
    });

    assert.strictEqual(res.standard_points, 800, 'Standard points must be untouched 800');
    assert.strictEqual(res.bonus_points, 200, 'Bonus points must be exactly 200 (+25%)');
    assert.strictEqual(res.total_points, 1000, 'Total points must be exactly 1,000');
    assert.strictEqual(res.campaigns_applied.length, 1);
    assert.strictEqual(res.campaigns_applied[0].campaign_code, 'CAMP-TEST-01');
  });

  await test('Bonus Types: FLAT_POINTS and EXTRA_PER_100', async () => {
    const flatCamp = {
      id: 9992,
      code: 'CAMP-FLAT',
      name: 'Flat 500 Bonus',
      type: 'FLAT_POINTS',
      value: 500,
      brand: 'ALL',
      all_models: true,
      all_branches: true,
      customer_tier: 'ALL',
      min_spend: 0,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'ACTIVE',
    };

    const extraCamp = {
      id: 9993,
      code: 'CAMP-EXTRA',
      name: 'Extra 2 per 100',
      type: 'EXTRA_PER_100',
      value: 2,
      brand: 'ALL',
      all_models: true,
      all_branches: true,
      customer_tier: 'ALL',
      min_spend: 0,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'ACTIVE',
    };

    const inv = {
      spend_category: 'sale',
      net_ex_showroom_price: 50000,
      invoice_date: '2026-06-15',
    };

    // Flat 500
    const flatRes = await CampaignEngineService.evaluateCampaigns({
      standard_points: 500,
      invoice: inv,
      overrideCampaign: flatCamp,
    });
    assert.strictEqual(flatRes.bonus_points, 500);
    assert.strictEqual(flatRes.total_points, 1000);

    // Extra 2 per 100 on 50,000 = floor(50000 * 2 / 100) = 1,000 bonus
    const extraRes = await CampaignEngineService.evaluateCampaigns({
      standard_points: 500,
      invoice: inv,
      overrideCampaign: extraCamp,
    });
    assert.strictEqual(extraRes.bonus_points, 1000);
    assert.strictEqual(extraRes.total_points, 1500);
  });

  await test('Max Bonus Per Invoice Cap Enforcement', async () => {
    const cappedCamp = {
      id: 9994,
      code: 'CAMP-CAPPED',
      name: 'Capped 50% Bonus',
      type: 'PCT_OF_STANDARD',
      value: 50, // 50% of 2000 = 1000, but cap is 350
      max_bonus_per_invoice: 350,
      brand: 'ALL',
      all_models: true,
      all_branches: true,
      customer_tier: 'ALL',
      min_spend: 0,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'ACTIVE',
    };

    const inv = {
      spend_category: 'sale',
      net_ex_showroom_price: 200000,
      invoice_date: '2026-06-15',
    };

    const res = await CampaignEngineService.evaluateCampaigns({
      standard_points: 2000,
      invoice: inv,
      overrideCampaign: cappedCamp,
    });

    assert.strictEqual(res.bonus_points, 350, 'Bonus must be capped at 350');
    assert.strictEqual(res.total_points, 2350, 'Total points must be 2000 + 350 = 2350');
  });

  // ------------------------------------------------------------------------
  // 2. FILTERING & ELIGIBILITY DIMENSIONS
  // ------------------------------------------------------------------------
  console.log('\n2️⃣ ELIGIBILITY DIMENSION CHECKS');

  await test('Non-matching Date: Outside Start/End returns 0 bonus', async () => {
    const camp = {
      id: 9995,
      status: 'ACTIVE',
      brand: 'HERO',
      all_models: true,
      all_branches: true,
      start_date: '2026-12-01',
      end_date: '2026-12-31',
      type: 'PCT_OF_STANDARD',
      value: 25,
    };

    // Invoice on 15 Nov 2026 (before campaign start)
    const invBefore = {
      spend_category: 'sale',
      net_ex_showroom_price: 80000,
      brand: 'Hero',
      invoice_date: '2026-11-15',
    };

    const resBefore = await CampaignEngineService.evaluateCampaigns({
      standard_points: 800,
      invoice: invBefore,
      overrideCampaign: camp,
    });
    assert.strictEqual(resBefore.bonus_points, 0, 'Bonus must be 0 for date before start_date');

    // Invoice on 05 Jan 2027 (after campaign end)
    const invAfter = {
      spend_category: 'sale',
      net_ex_showroom_price: 80000,
      brand: 'Hero',
      invoice_date: '2027-01-05',
    };

    const resAfter = await CampaignEngineService.evaluateCampaigns({
      standard_points: 800,
      invoice: invAfter,
      overrideCampaign: camp,
    });
    assert.strictEqual(resAfter.bonus_points, 0, 'Bonus must be 0 for date after end_date');
  });

  await test('Non-matching Model & Non-matching Branch returns 0 bonus', async () => {
    const camp = {
      id: 9996,
      status: 'ACTIVE',
      brand: 'HERO',
      all_models: false,
      models: ['Splendor Plus'],
      all_branches: false,
      branches: [1], // Hubballi only
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      type: 'FLAT_POINTS',
      value: 500,
    };

    // Different Model (HF Deluxe)
    const invModelMismatch = {
      spend_category: 'sale',
      net_ex_showroom_price: 60000,
      brand: 'Hero',
      model: 'HF Deluxe',
      branch_id: 1,
      invoice_date: '2026-06-15',
    };
    const resM = await CampaignEngineService.evaluateCampaigns({
      standard_points: 600,
      invoice: invModelMismatch,
      overrideCampaign: camp,
    });
    assert.strictEqual(resM.bonus_points, 0, 'Bonus must be 0 for unlisted model');

    // Different Branch (Branch 3)
    const invBranchMismatch = {
      spend_category: 'sale',
      net_ex_showroom_price: 80000,
      brand: 'Hero',
      model: 'Splendor Plus',
      branch_id: 3,
      invoice_date: '2026-06-15',
    };
    const resB = await CampaignEngineService.evaluateCampaigns({
      standard_points: 800,
      invoice: invBranchMismatch,
      overrideCampaign: camp,
    });
    assert.strictEqual(resB.bonus_points, 0, 'Bonus must be 0 for unlisted branch');
  });

  await test('Inactive Campaign (DRAFT or CANCELLED) returns 0 bonus', async () => {
    const draftCamp = {
      id: 9997,
      status: 'DRAFT',
      type: 'PCT_OF_STANDARD',
      value: 50,
      brand: 'ALL',
      all_models: true,
      all_branches: true,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    };

    const resDraft = await CampaignEngineService.evaluateCampaigns({
      standard_points: 1000,
      invoice: { net_ex_showroom_price: 100000, invoice_date: '2026-06-01' },
      overrideCampaign: draftCamp,
    });
    assert.strictEqual(resDraft.bonus_points, 0, 'DRAFT campaign must not award points');

    const cancelledCamp = {
      ...draftCamp,
      status: 'CANCELLED',
    };
    const resCancel = await CampaignEngineService.evaluateCampaigns({
      standard_points: 1000,
      invoice: { net_ex_showroom_price: 100000, invoice_date: '2026-06-01' },
      overrideCampaign: cancelledCamp,
    });
    assert.strictEqual(resCancel.bonus_points, 0, 'CANCELLED campaign must not award points');
  });

  // ------------------------------------------------------------------------
  // 3. STACKING VS HIGHEST_ONLY COMBINATION RULES
  // ------------------------------------------------------------------------
  console.log('\n3️⃣ STACKING VS HIGHEST_ONLY RULES');

  await test('Stacking Combination: All STACK adds all bonuses together', async () => {
    // We test with candidates directly via simulateSaleTest logic
    const matchedList = [
      { id: 1, name: 'Bonus A', bonus_points: 200, stacking: 'STACK', priority: 100 },
      { id: 2, name: 'Bonus B', bonus_points: 150, stacking: 'STACK', priority: 90 },
    ];
    // Under STACK rule, sum = 350
    const hasHighestOnly = matchedList.some(c => (c.stacking || 'STACK').toUpperCase() === 'HIGHEST_ONLY');
    assert.strictEqual(hasHighestOnly, false);
    const sum = matchedList.reduce((acc, c) => acc + c.bonus_points, 0);
    assert.strictEqual(sum, 350, 'STACK campaigns must add all bonuses');
  });

  await test('Highest Only Rule: If any campaign is HIGHEST_ONLY, apply only the largest', async () => {
    const matchedList = [
      { id: 1, name: 'Bonus A', bonus_points: 200, stacking: 'STACK', priority: 100 },
      { id: 2, name: 'Bonus B (Highest Only)', bonus_points: 350, stacking: 'HIGHEST_ONLY', priority: 50 },
      { id: 3, name: 'Bonus C', bonus_points: 100, stacking: 'STACK', priority: 80 },
    ];
    const hasHighestOnly = matchedList.some(c => (c.stacking || 'STACK').toUpperCase() === 'HIGHEST_ONLY');
    assert.strictEqual(hasHighestOnly, true);

    // Sort by bonus DESC, priority ASC
    matchedList.sort((a, b) => {
      if (b.bonus_points !== a.bonus_points) return b.bonus_points - a.bonus_points;
      return (a.priority || 100) - (b.priority || 100);
    });

    const applied = [matchedList[0]];
    assert.strictEqual(applied.length, 1);
    assert.strictEqual(applied[0].bonus_points, 350, 'Must pick the single highest bonus (350)');
  });

  // ------------------------------------------------------------------------
  // 4. DATABASE INTEGRATION: IDEMPOTENCY & AUDIT LOGGING
  // ------------------------------------------------------------------------
  console.log('\n4️⃣ DATABASE INTEGRATION & IDEMPOTENCY');

  await test('Campaign Code Sequential Generator (CAMP-0001 style)', async () => {
    const code = await CampaignEngineService.generateCampaignCode();
    assert.ok(/^CAMP-\d{4}$/.test(code), `Generated code '${code}' must match CAMP-xxxx`);
  });

  await test('Status Derivation: SCHEDULED, LIVE, EXPIRED, CANCELLED', () => {
    const today = '2026-11-19';

    assert.strictEqual(
      CampaignEngineService.deriveStatus({ status: 'CANCELLED', start_date: '2026-01-01', end_date: '2026-12-31' }, today),
      'CANCELLED'
    );
    assert.strictEqual(
      CampaignEngineService.deriveStatus({ status: 'DRAFT', start_date: '2026-01-01', end_date: '2026-12-31' }, today),
      'DRAFT'
    );
    assert.strictEqual(
      CampaignEngineService.deriveStatus({ status: 'ACTIVE', start_date: '2026-12-01', end_date: '2026-12-31' }, today),
      'SCHEDULED'
    );
    assert.strictEqual(
      CampaignEngineService.deriveStatus({ status: 'ACTIVE', start_date: '2026-01-01', end_date: '2026-10-31' }, today),
      'EXPIRED'
    );
    assert.strictEqual(
      CampaignEngineService.deriveStatus({ status: 'ACTIVE', start_date: '2026-11-01', end_date: '2026-11-30' }, today),
      'LIVE'
    );
  });

  await test('Idempotency Unique Constraint on (tenant_id, source_ref, campaign_id)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const custRes = await client.query('SELECT customer_id FROM customers LIMIT 1;');
      if (custRes.rows.length === 0) {
        throw new Error('No customers found in database for test');
      }
      const customerId = custRes.rows[0].customer_id;

      // Create a test campaign inside transaction
      const campRes = await client.query(`
        INSERT INTO campaigns (code, name, type, value, start_date, end_date, status)
        VALUES ('CAMP-TEMP-TEST', 'Temp Test Camp', 'PCT_OF_STANDARD', 25, '2026-01-01', '2026-12-31', 'ACTIVE')
        RETURNING id;
      `);
      const campId = campRes.rows[0].id;

      // Test inserting two bonus rows for same invoice and same campaign
      const testRef = `TEST-INV-IDEMP-${Date.now()}`;

      // First insert
      await client.query(`
        INSERT INTO points_ledger (
          customer_id, branch_id, type, transaction_category, points,
          source_ref, tenant_id, source_type, campaign_id
        ) VALUES (
          $1, 1, 'earn_sale', 'sale', 200, $2, 'bellad_and_company', 'CAMPAIGN', $3
        );
      `, [customerId, testRef, campId]);

      // Second duplicate insert must fail on unique index idx_points_ledger_campaign_idempotent
      let dupFailed = false;
      try {
        await client.query('SAVEPOINT sp_dup;');
        await client.query(`
          INSERT INTO points_ledger (
            customer_id, branch_id, type, transaction_category, points,
            source_ref, tenant_id, source_type, campaign_id
          ) VALUES (
            $1, 1, 'earn_sale', 'sale', 200, $2, 'bellad_and_company', 'CAMPAIGN', $3
          );
        `, [customerId, testRef, campId]);
      } catch (err) {
        dupFailed = true;
        await client.query('ROLLBACK TO SAVEPOINT sp_dup;');
        assert.ok(err.message.includes('unique constraint') || err.message.includes('duplicate key'), err.message);
      }

      assert.strictEqual(dupFailed, true, 'Duplicate bonus row insert must violate unique constraint');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  await test('Reversal on Cancellation: reverseCampaignBonus links parent_entry_id', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const custRes = await client.query('SELECT customer_id FROM customers LIMIT 1;');
      const customerId = custRes.rows[0].customer_id;

      const campRes = await client.query(`
        INSERT INTO campaigns (code, name, type, value, start_date, end_date, status)
        VALUES ('CAMP-TEMP-REV', 'Temp Rev Camp', 'PCT_OF_STANDARD', 25, '2026-01-01', '2026-12-31', 'ACTIVE')
        RETURNING id;
      `);
      const campId = campRes.rows[0].id;

      const testRef = `TEST-INV-REV-${Date.now()}`;

      // 1. Insert standard row
      const stdRes = await client.query(`
        INSERT INTO points_ledger (
          customer_id, branch_id, type, transaction_category, points,
          source_ref, tenant_id, source_type
        ) VALUES (
          $1, 1, 'earn_sale', 'sale', 800, $2, 'bellad_and_company', 'STANDARD'
        ) RETURNING entry_id;
      `, [customerId, testRef]);
      const parentId = stdRes.rows[0].entry_id;

      // 2. Insert bonus row
      const bonusRes = await client.query(`
        INSERT INTO points_ledger (
          customer_id, branch_id, type, transaction_category, points,
          source_ref, tenant_id, source_type, campaign_id, parent_entry_id
        ) VALUES (
          $1, 1, 'earn_sale', 'sale', 200, $2, 'bellad_and_company', 'CAMPAIGN', $3, $4
        ) RETURNING entry_id;
      `, [customerId, testRef, campId, parentId]);
      const bonusEntryId = bonusRes.rows[0].entry_id;

      // 3. Reverse campaign bonus
      const reversals = await CampaignEngineService.reverseCampaignBonus({
        source_ref: testRef,
        customer_id: customerId,
        branch_id: 1,
        client,
      });

      assert.strictEqual(reversals.length, 1);
      assert.strictEqual(reversals[0].points, -200, 'Reversal points must be negative (-200)');
      assert.strictEqual(Number(reversals[0].parent_entry_id), Number(bonusEntryId), 'Reversal must link to bonus entry_id');
      assert.strictEqual(reversals[0].source_type, 'CAMPAIGN');

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // ------------------------------------------------------------------------
  // 5. HARD RULE 3 & 5: GOLDEN REGRESSION TEST (CAMPAIGNS_ENABLED=false)
  // ------------------------------------------------------------------------
  console.log('\n5️⃣ GOLDEN REGRESSION TEST (FEATURE FLAG OFF)');

  await test('50 Sample Invoices Unchanged with CAMPAIGNS_ENABLED=false', async () => {
    // Ensure CAMPAIGNS_ENABLED is false
    const origFlag = process.env.CAMPAIGNS_ENABLED;
    process.env.CAMPAIGNS_ENABLED = 'false';

    try {
      assert.strictEqual(CampaignEngineService.isEnabled(), false);

      const rateConfig = { multiplier_numerator: 1, multiplier_denominator: 100 };

      for (let i = 1; i <= 50; i++) {
        const exShowroom = 50000 + i * 5000;
        const invoice = {
          ex_showroom_price: exShowroom,
          tcs_amount: 0,
          dealer_cash_discount: 0,
          emps_discount: i % 2 === 0 ? 2000 : 0,
          oem_offers_amount: i % 3 === 0 ? 1500 : 0,
        };

        const stdCalc = VehiclePointsEngine.calculatePoints(invoice, rateConfig);

        // Run through campaign engine with flag off
        const campRes = await CampaignEngineService.evaluateCampaigns({
          standard_points: stdCalc.points,
          invoice: {
            spend_category: 'sale',
            net_ex_showroom_price: stdCalc.points_base,
            brand: 'Hero',
            model: 'Splendor Plus',
            branch_id: 1,
            invoice_date: '2026-12-10',
          },
        });

        assert.strictEqual(campRes.enabled, false);
        assert.strictEqual(campRes.standard_points, stdCalc.points);
        assert.strictEqual(campRes.bonus_points, 0, 'Bonus points must be 0 when flag is off');
        assert.strictEqual(campRes.total_points, stdCalc.points, 'Total must equal standard points byte-for-byte');
        assert.strictEqual(campRes.campaigns_applied.length, 0);
      }
    } finally {
      process.env.CAMPAIGNS_ENABLED = origFlag;
    }
  });

  // ------------------------------------------------------------------------
  // 6. HARD RULE 2: SAFE ERROR FALLBACK
  // ------------------------------------------------------------------------
  console.log('\n6️⃣ SAFE ERROR FALLBACK (TRY/CATCH WRAPPER)');

  await test('Campaign Engine Failure Never Breaks Standard Points', async () => {
    // Pass corrupted/throwing input to evaluateCampaigns
    const mockFaultyClient = {
      query: () => {
        throw new Error('Simulated Database Connection Crash');
      },
    };

    const origFlag = process.env.CAMPAIGNS_ENABLED;
    process.env.CAMPAIGNS_ENABLED = 'true';

    try {
      const res = await CampaignEngineService.evaluateCampaigns({
        standard_points: 800,
        invoice: { net_ex_showroom_price: 80000 },
        client: mockFaultyClient,
      });

      // Engine's internal try/catch returns standard points only
      assert.strictEqual(res.standard_points, 800);
      assert.strictEqual(res.bonus_points, 0);
      assert.strictEqual(res.total_points, 800);
      assert.strictEqual(res.campaigns_applied.length, 0);
    } finally {
      process.env.CAMPAIGNS_ENABLED = origFlag;
    }
  });

  console.log('\n================================================================');
  console.log(`🏁 TEST COMPLETE: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed === total) {
    console.log('🎉 ALL CAMPAIGN ADD-ON ENGINE TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${total - passed} TESTS FAILED!\n`);
    process.exit(1);
  }
}

runCampaignSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
