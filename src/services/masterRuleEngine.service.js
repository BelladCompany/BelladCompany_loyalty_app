/**
 * Master Rule Engine Service ("The Loyalty App Brain")
 * 
 * Handles dynamic evaluation of master loyalty rules based on:
 * - Vehicle Type: 2W, 4W, ALL
 * - Brand, Model, Variant
 * - Branch
 * - Spend Type: service, sale, accessories, bodyshop, redemption
 * - Scheme Type: gift_cards, referral, inhouse_exchange, inhouse_insurance, inhouse_finance, google_rating, etc.
 * - Customer Priority Tier: silver, gold, platinum, ALL
 * - Date Range: applicable_from -> applicable_upto
 * - Spend Amount Range: min_spend_paise, max_spend_paise
 * - Approval Status: approved & is_active = true
 */
const { pool } = require('../config/db');

class MasterRuleEngineService {
  /**
   * Resolves the best matching active rule for a transaction context.
   */
  static async resolveRule({
    tenant_id = 'bellad_and_company',
    scheme_type,
    spend_type = 'sale',
    vehicle_type = 'ALL',
    brand_name = 'ALL',
    model_name = 'ALL',
    variant_name = 'ALL',
    branch_name = 'ALL',
    priority_tier = 'ALL',
    spend_amount = 0, // In rupees
    transaction_date = new Date(),
    client = pool,
  }) {
    const spendPaise = Math.round(Number(spend_amount || 0) * 100);
    const dateToCheck = new Date(transaction_date);

    const query = `
      SELECT *
      FROM master_loyalty_rules
      WHERE tenant_id = $1
        AND is_active = true
        AND approval_status = 'approved'
        AND applicable_from <= $2
        AND applicable_upto >= $2
        AND spend_type = $3
        AND ($4::varchar IS NULL OR LOWER(scheme_type) = LOWER($4))
        AND (vehicle_type = 'ALL' OR LOWER(vehicle_type) = LOWER($5) OR $5 = 'ALL')
        AND (min_spend_paise <= $6)
        AND (max_spend_paise IS NULL OR max_spend_paise >= $6)
      ORDER BY
        priority_weight DESC,
        created_at DESC;
    `;

    const res = await client.query(query, [
      tenant_id,
      dateToCheck,
      spend_type,
      scheme_type || null,
      vehicle_type,
      spendPaise,
    ]);

    const candidates = res.rows;
    if (!candidates || candidates.length === 0) {
      return null;
    }

    // Score candidates based on specificity:
    // 1. Model match: Exact or substring (+20 pts)
    // 2. Variant match: Exact (+15 pts)
    // 3. Branch match: Exact or city/branch substring (+10 pts)
    // 4. Vehicle Type match: Exact (+8 pts)
    // 5. Tier match: Exact (+5 pts)
    // 6. Brand match: Exact (+3 pts)
    const norm = (str) => String(str || '').toLowerCase().trim();

    let bestRule = null;
    let highestScore = -1;

    for (const rule of candidates) {
      let score = 0;

      // Brand check
      const normBrand = norm(brand_name);
      const ruleBrand = norm(rule.brand_name);
      if (ruleBrand === normBrand && normBrand !== 'all') {
        score += 3;
      } else if (ruleBrand !== 'all' && normBrand !== 'all' && !ruleBrand.includes(normBrand) && !normBrand.includes(ruleBrand)) {
        // Disqualify if strict brand mismatch (e.g. Hero rule when brand is MG Motors)
        continue;
      }

      // Model check
      const ruleModels = Array.isArray(rule.models) ? rule.models : [];
      const hasWildcardModel = ruleModels.some((m) => norm(m) === 'all' || m === '*');
      const matchesExactModel = ruleModels.some((m) => norm(m) === norm(model_name) || (norm(model_name) !== 'all' && (norm(m).includes(norm(model_name)) || norm(model_name).includes(norm(m)))));

      if (matchesExactModel) {
        score += 20;
      } else if (!hasWildcardModel && norm(model_name) !== 'all') {
        continue;
      }

      // Variant check
      const ruleVariants = Array.isArray(rule.variants) ? rule.variants : [];
      const hasWildcardVariant = ruleVariants.some((v) => norm(v) === 'all' || v === '*');
      const matchesExactVariant = ruleVariants.some((v) => norm(v) === norm(variant_name));

      if (matchesExactVariant) {
        score += 15;
      } else if (!hasWildcardVariant && norm(variant_name) !== 'all') {
        continue;
      }

      // Branch check
      const ruleBranches = Array.isArray(rule.branches) ? rule.branches : [];
      const hasWildcardBranch = ruleBranches.some((b) => norm(b) === 'all' || b === '*');
      const matchesExactBranch = ruleBranches.some((b) => norm(b) === norm(branch_name) || (norm(branch_name) !== 'all' && (norm(b).includes(norm(branch_name)) || norm(branch_name).includes(norm(b)))));

      if (matchesExactBranch) {
        score += 10;
      } else if (!hasWildcardBranch && norm(branch_name) !== 'all') {
        continue;
      }

      // Vehicle type specificity
      if (norm(rule.vehicle_type) === norm(vehicle_type) && vehicle_type !== 'ALL') {
        score += 8;
      }

      // Priority tier specificity
      if (rule.priority_tier && norm(rule.priority_tier) === norm(priority_tier) && priority_tier !== 'ALL') {
        score += 5;
      } else if (rule.priority_tier !== 'ALL' && norm(priority_tier) !== 'all' && norm(rule.priority_tier) !== norm(priority_tier)) {
        continue;
      }

      // Add rule priority weight
      score += Number(rule.priority_weight || 100);

      if (score > highestScore) {
        highestScore = score;
        bestRule = rule;
      }
    }

    return bestRule;
  }

  /**
   * Pure calculation function: computes discount and points outcome based on the resolved rule.
   */
  static calculateOutcome({
    invoice_amount = 0, // Rupees
    rule = null,
  }) {
    const grossAmount = Math.max(0, Number(invoice_amount || 0));

    if (!rule) {
      // Default fallback when no rule matches
      const fallbackPoints = Math.floor(grossAmount * 0.01); // Standard 1% fallback
      return {
        has_matched_rule: false,
        rule_name: 'Default System Fallback',
        rule_code: 'DEFAULT_FALLBACK',
        discount_amount: 0,
        discount_percentage: 0,
        net_points_base: grossAmount,
        earned_points: fallbackPoints,
        bonus_points: 0,
        total_points: fallbackPoints,
        redemption_value_rupees: Math.round(fallbackPoints * 0.25 * 100) / 100,
        reason: 'No active director rule found; applied standard 1% baseline',
      };
    }

    // 1. Calculate Discount
    let discountAmount = 0;
    let discountPercentage = 0;

    if (rule.discount_type === 'percentage') {
      discountPercentage = Number(rule.discount_value || 0);
      discountAmount = (grossAmount * discountPercentage) / 100;
    } else if (rule.discount_type === 'flat_amount') {
      discountAmount = Number(rule.discount_value || 0);
      discountPercentage = grossAmount > 0 ? (discountAmount / grossAmount) * 100 : 0;
    }

    // Enforce max discount cap if defined
    if (rule.max_discount_paise != null) {
      const maxDiscountRs = Number(rule.max_discount_paise) / 100;
      if (discountAmount > maxDiscountRs) {
        discountAmount = maxDiscountRs;
        discountPercentage = grossAmount > 0 ? (discountAmount / grossAmount) * 100 : 0;
      }
    }

    // Discount cannot exceed gross invoice amount
    discountAmount = Math.min(discountAmount, grossAmount);

    // 2. Net Points Base
    const netPointsBase = rule.discount_deductible_from_base
      ? Math.max(0, grossAmount - discountAmount)
      : grossAmount;

    // 3. Points Calculation
    const num = BigInt(rule.points_multiplier_numerator || 1);
    const den = BigInt(rule.points_multiplier_denominator || 100);

    const baseBig = BigInt(Math.floor(netPointsBase));
    const earnedPoints = Number((baseBig * num) / (den > 0n ? den : 100n));
    const bonusPoints = Number(rule.bonus_points || 0);
    const totalPoints = Math.floor(earnedPoints + bonusPoints);

    const redemptionRate = Number(rule.redemption_rate_rupees_per_point || 0.2500);
    const redemptionValue = Math.round(totalPoints * redemptionRate * 100) / 100;

    return {
      has_matched_rule: true,
      rule_id: rule.rule_id,
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      scheme_type: rule.scheme_type,
      spend_type: rule.spend_type,
      vehicle_type: rule.vehicle_type,
      gross_invoice_amount: grossAmount,
      discount_type: rule.discount_type,
      discount_value_configured: Number(rule.discount_value),
      discount_amount: Math.round(discountAmount * 100) / 100,
      discount_percentage: Math.round(discountPercentage * 100) / 100,
      net_points_base: Math.round(netPointsBase * 100) / 100,
      points_multiplier: `${rule.points_multiplier_numerator}/${rule.points_multiplier_denominator}`,
      earned_points: earnedPoints,
      bonus_points: bonusPoints,
      total_points: totalPoints,
      redemption_rate: redemptionRate,
      redemption_value_rupees: redemptionValue,
      applicable_window: `${rule.applicable_from} to ${rule.applicable_upto}`,
      reason: `Applied rule "${rule.rule_name}" (${rule.rule_code}): Discount ₹${Math.round(discountAmount)} + ${totalPoints} points`,
    };
  }

  /**
   * Live Simulator: matches rule and calculates outcome for test inputs.
   */
  static async simulateRuleCalculation({
    tenant_id = 'bellad_and_company',
    scheme_type,
    spend_type = 'sale',
    vehicle_type = 'ALL',
    brand_name = 'ALL',
    model_name = 'ALL',
    variant_name = 'ALL',
    branch_name = 'ALL',
    priority_tier = 'ALL',
    spend_amount = 0,
    transaction_date = new Date(),
  }) {
    const matchedRule = await this.resolveRule({
      tenant_id,
      scheme_type,
      spend_type,
      vehicle_type,
      brand_name,
      model_name,
      variant_name,
      branch_name,
      priority_tier,
      spend_amount,
      transaction_date,
    });

    const calculation = this.calculateOutcome({
      invoice_amount: spend_amount,
      rule: matchedRule,
    });

    return {
      simulation_inputs: {
        scheme_type,
        spend_type,
        vehicle_type,
        brand_name,
        model_name,
        variant_name,
        branch_name,
        priority_tier,
        spend_amount,
        transaction_date,
      },
      matched_rule: matchedRule,
      calculation,
    };
  }
}

module.exports = MasterRuleEngineService;
