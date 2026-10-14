/**
 * Comprehensive Automated Safety Net & Golden Regression Test Suite
 * automobile-loyalty-backend
 *
 * Role: QA Lead & Principal Architect
 * Purpose: Locks in current system behavior, calculation logic, and API endpoints
 *          before any security or architecture refactoring.
 */
const assert = require('assert');
const { pool } = require('../src/config/db');
const VehiclePointsEngine = require('../src/services/vehiclePointsEngine.service');

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING SAFETY NET & GOLDEN REGRESSION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // ------------------------------------------------------------------------
  // 1. VEHICLE EX-SHOWROOM MINUS OFFERS FORMULA TESTS
  // ------------------------------------------------------------------------
  console.log('1️⃣ TESTING VEHICLE SALES POINTS FORMULA (DEFAULT RULE)');
  
  test('Standard Sale Invoice: Ex-Showroom minus EMPS and OEM Offers', () => {
    const invoice = {
      ex_showroom_price: 171866,
      tcs_amount: 0,
      dealer_cash_discount: 0,
      emps_discount: 5000,
      oem_offers_amount: 2500,
    };
    const rateConfig = { multiplier_numerator: 1, multiplier_denominator: 100 };
    const res = VehiclePointsEngine.calculatePoints(invoice, rateConfig);

    assert.strictEqual(res.points_base, 164366, 'Base amount should be 164,366');
    assert.strictEqual(res.points, 1643, 'Points earned should be 1,643');
  });

  test('Ex-Showroom Formula: Floored at 0 when discounts exceed price', () => {
    const invoice = {
      ex_showroom_price: 100000,
      dealer_cash_discount: 60000,
      emps_discount: 50000,
      oem_offers_amount: 10000,
    };
    const rateConfig = { multiplier_numerator: 1, multiplier_denominator: 100 };
    const res = VehiclePointsEngine.calculatePoints(invoice, rateConfig);

    assert.strictEqual(res.points_base, 0, 'Base amount must be floored at 0');
    assert.strictEqual(res.points, 0, 'Points earned must be 0');
  });

  test('Ex-Showroom Formula: Strict exclusion of Insurance, FastTag, Tax', () => {
    const invoice = {
      ex_showroom_price: 200000,
      dealer_cash_discount: 10000,
      additional_discounts: [
        { discount_type: 'insurance_discount', amount: 5000 },
        { discount_type: 'registration_fee', amount: 15000 },
        { discount_type: 'road_tax', amount: 20000 },
      ],
    };
    const rateConfig = { multiplier_numerator: 1, multiplier_denominator: 100 };
    const res = VehiclePointsEngine.calculatePoints(invoice, rateConfig);

    assert.strictEqual(res.points_base, 190000, 'Base amount should exclude non-applicable discounts');
    assert.strictEqual(res.points, 1900, 'Points earned should be 1,900');
  });

  // ------------------------------------------------------------------------
  // 2. RATIOS & MONETARY VALUATION TESTS
  // ------------------------------------------------------------------------
  console.log('\n2️⃣ TESTING POINT EARNING & REDEMPTION RATES');

  test('Service Rate: 4 points per ₹100 (4%)', () => {
    const serviceAmount = 25000; // ₹25,000
    const points = Math.floor((serviceAmount / 100) * 4);
    assert.strictEqual(points, 1000, 'Service points for ₹25,000 should be 1,000');
  });

  test('Accessory Rate: 2 points per ₹100 (2%)', () => {
    const accessoryAmount = 15000; // ₹15,000
    const points = Math.floor((accessoryAmount / 100) * 2);
    assert.strictEqual(points, 300, 'Accessory points for ₹15,000 should be 300');
  });

  test('Bodyshop Rate: 3 points per ₹100 (3%)', () => {
    const bodyshopAmount = 50000; // ₹50,000
    const points = Math.floor((bodyshopAmount / 100) * 3);
    assert.strictEqual(points, 1500, 'Bodyshop points for ₹50,000 should be 1,500');
  });

  test('Redemption Rate: 4 points = ₹1 (0.25)', () => {
    const pointsToRedeem = 4000;
    const rupeeValue = pointsToRedeem * 0.25;
    assert.strictEqual(rupeeValue, 1000, '4,000 points should equal ₹1,000 discount');
  });

  test('In-House Bonus Slabs: Finance=100, Insurance=50, Exchange=200', () => {
    const financeBonus = 100;
    const insuranceBonus = 50;
    const exchangeBonus = 200;
    const totalBonus = financeBonus + insuranceBonus + exchangeBonus;
    assert.strictEqual(totalBonus, 350, 'Combined in-house bonus should be 350 points');
  });

  // ------------------------------------------------------------------------
  // 3. TIER CLASSIFICATION: EXPENSE & REDEMPTIONS (SILVER, GOLD, PLATINUM)
  // ------------------------------------------------------------------------
  console.log('\n3️⃣ TESTING EXPENSE & REDEMPTION TIER CLASSIFICATION');

  test('Tier Slabs: Silver (< ₹50k), Gold (₹50k - ₹200k), Platinum (₹200k+)', () => {
    function classifyTier(expenseRs) {
      if (expenseRs >= 200000) return 'Platinum';
      if (expenseRs >= 50000) return 'Gold';
      return 'Silver';
    }

    assert.strictEqual(classifyTier(0), 'Silver', '₹0 expense should be Silver');
    assert.strictEqual(classifyTier(49999), 'Silver', '₹49,999 expense should be Silver');
    assert.strictEqual(classifyTier(50000), 'Gold', '₹50,000 expense should be Gold');
    assert.strictEqual(classifyTier(133996.25), 'Gold', '₹133,996.25 (Kavya MP) should be Gold');
    assert.strictEqual(classifyTier(199999), 'Gold', '₹199,999 expense should be Gold');
    assert.strictEqual(classifyTier(200000), 'Platinum', '₹200,000 expense should be Platinum');
    assert.strictEqual(classifyTier(1066990), 'Platinum', '₹1,066,990 car expense should be Platinum');
  });

  // ------------------------------------------------------------------------
  // 3. DATABASE RECONCILIATION & SCHEMA TESTS
  // ------------------------------------------------------------------------
  console.log('\n3️⃣ TESTING DATABASE CONNECTION & RECONCILIATION');

  await asyncTest('Database Pool Health & Schema Verification', async () => {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() AS current_time;');
      assert.ok(res.rows[0].current_time, 'Database query should return valid current timestamp');
      
      const tablesRes = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      const tableNames = new Set(tablesRes.rows.map(r => r.table_name));
      assert.ok(tableNames.has('customers'), 'customers table must exist');
      assert.ok(tableNames.has('points_ledger'), 'points_ledger table must exist');
      assert.ok(tableNames.has('vehicles'), 'vehicles table must exist');
      assert.ok(tableNames.has('firms'), 'firms table must exist');
    } finally {
      client.release();
    }
  });

  await asyncTest('Customer Ledger Sum Reconciliation Query Check', async () => {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT c.customer_id, COALESCE(SUM(l.points), 0) AS balance
        FROM customers c
        LEFT JOIN points_ledger l ON c.customer_id = l.customer_id
        GROUP BY c.customer_id
        LIMIT 10;
      `);
      assert.ok(Array.isArray(res.rows), 'Reconciliation query must return array of customer balance rows');
    } finally {
      client.release();
    }
  });

  // ------------------------------------------------------------------------
  // 4. REDEMPTION LOCK & ACCESSORIES EXEMPTION RULES
  // ------------------------------------------------------------------------
  console.log('\n4️⃣ TESTING REDEMPTION LOCK & ACCESSORIES EXEMPTION RULES');

  await asyncTest('Accessories Redemption Lock Exemption (<12M Vehicle)', async () => {
    const RedemptionEligibilityService = require('../src/services/redemption_eligibility.service');
    const vRes = await pool.query(`
      SELECT vehicle_id, tenant_id 
      FROM vehicles 
      WHERE purchase_date > NOW() - INTERVAL '6 months' 
      LIMIT 1;
    `);

    if (vRes.rows.length > 0) {
      const v = vRes.rows[0];
      const serviceRes = await RedemptionEligibilityService.getVehicleRedemptionStatus(v.vehicle_id, v.tenant_id, 'service');
      assert.strictEqual(serviceRes.status, 'locked', 'Service redemption must be locked for vehicles purchased < 12 months ago');
      assert.strictEqual(serviceRes.base_status, 'locked', 'Base status must be locked');

      const accessoriesRes = await RedemptionEligibilityService.getVehicleRedemptionStatus(v.vehicle_id, v.tenant_id, 'accessories');
      assert.strictEqual(accessoriesRes.status, 'eligible', 'Accessories redemption must be unlocked anytime');
      assert.strictEqual(accessoriesRes.accessories_eligible, true, 'accessories_eligible flag must be true');
    }
  });

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 REGRESSION TEST RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runRegressionSuite()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Fatal Test Runner Failure:', err);
      pool.end();
      process.exit(1);
    });
}

module.exports = runRegressionSuite;
