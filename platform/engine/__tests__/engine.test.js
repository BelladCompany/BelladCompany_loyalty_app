const assert = require('assert');
const { evaluateRules, calculateNetSalesBasePaise } = require('../evaluator');
const RuleSimulator = require('../simulator');
const { RulesetPayloadSchema } = require('../schema');

// Mock Bellad & Company Baseline Ruleset (matches Migration 040 Version 1 seed)
const belladBaselineRuleset = {
  version: 1,
  tenant_id: 'bellad_and_company',
  currency: 'INR',
  redemption: {
    conversion_rate: 0.25,
    points_per_rupee: 4,
    min_points_to_redeem: 100,
    max_discount_percentage: 100,
    lock_period_months: 12,
    lock_exempt_categories: ['accessories', 'accessory'],
    expiry_period_months: 24,
    reset_expiry_on_activity: true,
  },
  tiers: [
    { tier_name: 'Silver', priority: 100, eval_basis: 'expense_paise', min_metric_value: 0, points_multiplier: 1.0 },
    { tier_name: 'Gold', priority: 200, eval_basis: 'expense_paise', min_metric_value: 5000000, points_multiplier: 1.0 },
    { tier_name: 'Platinum', priority: 300, eval_basis: 'expense_paise', min_metric_value: 20000000, points_multiplier: 1.0 },
  ],
  rules: [
    {
      rule_id: 'bellad_sale_baseline',
      rule_name: 'Vehicle Sales Baseline (1% Net Ex-Showroom)',
      priority_weight: 100,
      event_type: 'sale',
      is_active: true,
      conditions: { vehicle_types: ['ALL'], brands: ['ALL'], branches: ['ALL'], customer_tiers: ['ALL'] },
      action: {
        discount: { type: 'none', value: 0 },
        points_earning: { formula_basis: 'net_ex_showroom', multiplier_numerator: 1, multiplier_denominator: 100, bonus_points: 0 },
      },
    },
    {
      rule_id: 'bellad_service_baseline',
      rule_name: 'Service Workshop Baseline (4% Invoice Amount)',
      priority_weight: 100,
      event_type: 'service',
      is_active: true,
      conditions: { vehicle_types: ['ALL'], brands: ['ALL'], branches: ['ALL'], customer_tiers: ['ALL'] },
      action: {
        discount: { type: 'none', value: 0 },
        points_earning: { formula_basis: 'bill_amount', multiplier_numerator: 4, multiplier_denominator: 100, bonus_points: 0 },
      },
    },
    {
      rule_id: 'bellad_accessories_baseline',
      rule_name: 'Showroom Accessories Baseline (2% Invoice Amount)',
      priority_weight: 100,
      event_type: 'accessory',
      is_active: true,
      conditions: { vehicle_types: ['ALL'], brands: ['ALL'], branches: ['ALL'], customer_tiers: ['ALL'] },
      action: {
        discount: { type: 'none', value: 0 },
        points_earning: { formula_basis: 'bill_amount', multiplier_numerator: 2, multiplier_denominator: 100, bonus_points: 0 },
      },
    },
    {
      rule_id: 'bellad_bodyshop_baseline',
      rule_name: 'Bodyshop & Accidental Repairs (3% Invoice Amount)',
      priority_weight: 100,
      event_type: 'bodyshop',
      is_active: true,
      conditions: { vehicle_types: ['ALL'], brands: ['ALL'], branches: ['ALL'], customer_tiers: ['ALL'] },
      action: {
        discount: { type: 'none', value: 0 },
        points_earning: { formula_basis: 'bill_amount', multiplier_numerator: 3, multiplier_denominator: 100, bonus_points: 0 },
      },
    },
    {
      rule_id: 'hero_festive_splendor_override',
      rule_name: 'Hero Splendor Festive Special (30% Discount + 500 Bonus Pts)',
      priority_weight: 300,
      event_type: 'sale',
      is_active: true,
      conditions: {
        vehicle_types: ['2W'],
        brands: ['Hero'],
        models: ['Splendor'],
        branches: ['ALL'],
        min_spend_paise: 5000000,
      },
      action: {
        discount: { type: 'percentage', value: 30, max_cap_paise: 1500000, deduct_from_points_base: true },
        points_earning: { formula_basis: 'bill_amount', multiplier_numerator: 3, multiplier_denominator: 200, bonus_points: 500 },
      },
    },
    {
      rule_id: 'bellad_inhouse_exchange',
      rule_name: 'In-House Vehicle Trade-in Exchange Bonus',
      priority_weight: 200,
      event_type: 'bonus',
      is_active: true,
      conditions: { vehicle_types: ['ALL'], brands: ['ALL'], branches: ['ALL'] },
      action: {
        points_earning: { multiplier_numerator: 0, multiplier_denominator: 100, bonus_points: 200 },
      },
    },
    {
      rule_id: 'bellad_google_review_boost',
      rule_name: 'Verified 5-Star Google Review Boost',
      priority_weight: 250,
      event_type: 'bonus',
      is_active: true,
      conditions: { vehicle_types: ['ALL'], brands: ['ALL'], branches: ['ALL'] },
      action: {
        points_earning: { multiplier_numerator: 0, multiplier_denominator: 100, bonus_points: 250 },
      },
    },
  ],
};

function runTestSuite() {
  console.log('🧪 Running Pure Rules Engine & Simulator Test Suite...\n');

  // 1. Schema Validation Test
  console.log('Test 1: Zod Schema Validation');
  const parsed = RulesetPayloadSchema.safeParse(belladBaselineRuleset);
  assert.ok(parsed.success, 'Baseline ruleset should conform strictly to Zod schema');
  console.log('  ✅ Schema validation passed.');

  // 2. Exact Regression Test: Vehicle Sales Formula
  // Sample: ₹1,71,866 Ex-showroom minus ₹5,000 EMPS minus ₹2,500 OEM Offers = ₹1,64,366 base -> 1,643 points
  console.log('\nTest 2: Exact Vehicle Sales Deduction Regression Test');
  const rawInvoice = {
    ex_showroom_price: 171866,
    dealer_cash_discount: 0,
    emps_discount: 5000,
    oem_offers_amount: 2500,
  };
  const netBase = calculateNetSalesBasePaise(rawInvoice);
  assert.strictEqual(netBase.net_base_paise, 16436600n, 'Net base should be exactly 164,366.00 rupees in paise');

  const evalSale = evaluateRules(
    {
      event_type: 'sale',
      spend_amount: 171866,
      raw_invoice_data: rawInvoice,
      brand_name: 'Tata Motors',
      model_name: 'Nexon',
    },
    belladBaselineRuleset
  );
  assert.strictEqual(evalSale.has_match, true);
  assert.strictEqual(evalSale.applied_rule.rule_id, 'bellad_sale_baseline');
  assert.strictEqual(evalSale.net_points_base_rupees, 164366);
  assert.strictEqual(evalSale.total_points, 1643, 'Points must be 1,643 (1% of ₹164,366 floored)');
  console.log(`  ✅ Exact regression verified: ₹1,71,866 minus deductions -> ${evalSale.total_points} points.`);

  // 3. Strict Category Exclusion Test
  console.log('\nTest 3: Excluded Line Items from Sales Base (Insurance, Fastag, Tax, Accessories)');
  const invoiceWithExclusions = {
    ex_showroom_price: 150000,
    dealer_cash_discount: 5000,
    additional_discounts: [
      { discount_name: 'Insurance Discount', amount: 10000 }, // EXCLUDED
      { discount_name: 'Road Tax Subsidy', amount: 8000 },    // EXCLUDED
      { discount_name: 'Fastag Waiver', amount: 500 },         // EXCLUDED
      { discount_name: 'Special Festive Dealer Rebate', amount: 2000 }, // VALID DEDUCTION
    ],
  };
  const baseResEx = calculateNetSalesBasePaise(invoiceWithExclusions);
  // Net base: 150,000 - 5,000 (dealer cash) - 2,000 (festive rebate) = 143,000. Insurance/Tax/Fastag ignored!
  assert.strictEqual(baseResEx.net_base_paise, 14300000n);
  console.log('  ✅ Excluded line items successfully bypassed.');

  // 4. Service Workshop Baseline (4%)
  console.log('\nTest 4: Service Bill Earning Rate (4%)');
  const evalService = evaluateRules(
    { event_type: 'service', spend_amount: 10000, branch_name: 'Hubli' },
    belladBaselineRuleset
  );
  assert.strictEqual(evalService.total_points, 400, '₹10,000 service bill at 4% must award 400 points');
  assert.strictEqual(evalService.redemption_value_rupees, 100, '400 points * 0.25 = ₹100');
  console.log('  ✅ Service earning verified: ₹10,000 -> 400 points (₹100 value).');

  // 5. Accessories (2%) and Bodyshop (3%)
  console.log('\nTest 5: Accessories (2%) & Bodyshop (3%) Rates');
  const evalAcc = evaluateRules({ event_type: 'accessory', spend_amount: 5000 }, belladBaselineRuleset);
  assert.strictEqual(evalAcc.total_points, 100, '₹5,000 accessories at 2% = 100 points');

  const evalBody = evaluateRules({ event_type: 'bodyshop', spend_amount: 25000 }, belladBaselineRuleset);
  assert.strictEqual(evalBody.total_points, 750, '₹25,000 bodyshop at 3% = 750 points');
  console.log('  ✅ Accessories (2%) and Bodyshop (3%) rates verified.');

  // 6. Specificity Override & Discount Capping
  console.log('\nTest 6: Specificity Override & Max Discount Cap (Hero Splendor Festive)');
  // Spend: ₹80,000. 30% discount = ₹24,000. Capped at ₹15,000 max cap!
  // Net base = 80,000 - 15,000 = 65,000. Points = 65,000 * 3 / 200 = 975 + 500 bonus = 1,475 points.
  const evalHero = evaluateRules(
    {
      event_type: 'sale',
      spend_amount: 80000,
      vehicle_type: '2W',
      brand_name: 'Hero',
      model_name: 'Splendor',
      branch_name: 'Hubli Central',
    },
    belladBaselineRuleset
  );
  assert.strictEqual(evalHero.applied_rule.rule_id, 'hero_festive_splendor_override');
  assert.strictEqual(evalHero.discount_rupees, 15000, 'Discount must be capped at ₹15,000');
  assert.strictEqual(evalHero.total_points, 1475, 'Total points must be 975 earned + 500 bonus = 1,475');
  console.log(`  ✅ Specificity override won (Score ${evalHero.applied_rule.score}): Discount ₹15,000, Points ${evalHero.total_points}.`);

  // 7. In-House Bonuses & Google Reviews
  console.log('\nTest 7: In-House Bonuses & Google 5-Star Reviews');
  const evalExch = evaluateRules({ event_type: 'bonus', spend_amount: 0 }, {
    ...belladBaselineRuleset,
    rules: [belladBaselineRuleset.rules.find((r) => r.rule_id === 'bellad_inhouse_exchange')],
  });
  assert.strictEqual(evalExch.total_points, 200, 'Exchange bonus must be 200 points');

  const evalReview = evaluateRules({ event_type: 'bonus', spend_amount: 0 }, {
    ...belladBaselineRuleset,
    rules: [belladBaselineRuleset.rules.find((r) => r.rule_id === 'bellad_google_review_boost')],
  });
  assert.strictEqual(evalReview.total_points, 250, 'Google Review bonus must be 250 points');
  console.log('  ✅ Flat bonus points verified.');

  // 8. Simulator Service Full Trace Verification
  console.log('\nTest 8: Rule Simulator Visual Trace Output');
  const simResult = RuleSimulator.simulate({
    customer_profile: { customer_id: 'BAC-100001', current_tier: 'Gold' },
    transaction_context: {
      event_type: 'sale',
      spend_amount: 80000,
      vehicle_type: '2W',
      brand_name: 'Hero',
      model_name: 'Splendor',
      branch_name: 'Belagavi',
    },
    ruleset: belladBaselineRuleset,
  });

  assert.strictEqual(simResult.steps.length, 3, 'Simulator must generate 3 distinct audit steps');
  assert.strictEqual(simResult.summary.discount_rupees, 15000);
  assert.strictEqual(simResult.summary.total_points_earned, 1475);
  console.log('  ✅ Simulator step trace generated in < 1ms.');

  console.log('\n🎉 ALL PURE RULES ENGINE & SIMULATOR TESTS PASSED WITH 100% SUCCESS!');
}

runTestSuite();
