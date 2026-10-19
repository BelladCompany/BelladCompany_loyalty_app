/**
 * Pure, Deterministic Rules Engine Evaluator
 * 
 * Standard: Financial-grade integer arithmetic, zero side-effects, fully testable.
 * Computes discounts and loyalty points based on versioned rulesets.
 */

// Line items strictly excluded from vehicle sales points basis
const EXCLUDED_CATEGORIES = [
  'insurance',
  'processing_charge',
  'processing_charges',
  'package',
  'packages',
  'fast_tag',
  'fastag',
  'registration',
  'road_tax',
  'tax',
  'accessories',
  'accessory',
];

function isExcludedCategory(nameOrType) {
  if (!nameOrType) return false;
  const normalized = String(nameOrType).toLowerCase().trim().replace(/[\s_\-]+/g, '_');
  return EXCLUDED_CATEGORIES.some((cat) => normalized.includes(cat));
}

function normalizeStr(str) {
  return String(str || '').toLowerCase().trim();
}

/**
 * Calculates net sales points base (in paise) after eligible deductions.
 */
function calculateNetSalesBasePaise(rawInvoiceData) {
  const exShowroomPaise = BigInt(
    Math.round(Number(rawInvoiceData.ex_showroom_price || 0) * 100)
  );
  const dealerCashPaise = BigInt(
    Math.round(Number(rawInvoiceData.dealer_cash_discount || 0) * 100)
  );
  const empsPaise = BigInt(
    Math.round(Number(rawInvoiceData.emps_discount || 0) * 100)
  );
  const oemOffersPaise = BigInt(
    Math.round(Number(rawInvoiceData.oem_offers_amount || 0) * 100)
  );

  let additionalDeductionsPaise = 0n;
  const validDiscounts = [];

  if (Array.isArray(rawInvoiceData.additional_discounts)) {
    for (const disc of rawInvoiceData.additional_discounts) {
      const type = disc.discount_type || disc.discount_name || '';
      const name = disc.discount_name || disc.discount_type || 'discount';
      if (!isExcludedCategory(type) && !isExcludedCategory(name)) {
        const amt = Math.round(Number(disc.amount || 0) * 100);
        if (amt > 0) {
          additionalDeductionsPaise += BigInt(amt);
          validDiscounts.push({ name, amount_paise: amt });
        }
      }
    }
  }

  const totalDeductionsPaise = dealerCashPaise + empsPaise + oemOffersPaise + additionalDeductionsPaise;
  const netBasePaise = exShowroomPaise > totalDeductionsPaise ? exShowroomPaise - totalDeductionsPaise : 0n;

  return {
    gross_paise: exShowroomPaise,
    total_deductions_paise: totalDeductionsPaise,
    net_base_paise: netBasePaise,
    valid_discounts: validDiscounts,
  };
}

/**
 * Checks if a specific rule matches the transaction context and calculates its specificity score.
 */
function matchRule(rule, context) {
  if (rule.is_active === false) {
    return { matches: false, reason: 'Rule is inactive' };
  }

  if (rule.event_type !== context.event_type) {
    return { matches: false, reason: `Event type mismatch (${rule.event_type} !== ${context.event_type})` };
  }

  const cond = rule.conditions || {};
  let score = Number(rule.priority_weight || 100);

  // 1. Date window check
  if (cond.date_window) {
    const txDate = context.transaction_date ? new Date(context.transaction_date) : new Date();
    if (cond.date_window.from && new Date(cond.date_window.from) > txDate) {
      return { matches: false, reason: 'Transaction before date window' };
    }
    if (cond.date_window.to && new Date(cond.date_window.to) < txDate) {
      return { matches: false, reason: 'Transaction after date window' };
    }
  }

  // 2. Spend range check (in paise)
  const spendPaise = BigInt(Math.round(Number(context.spend_amount || 0) * 100));
  if (cond.min_spend_paise != null && spendPaise < BigInt(cond.min_spend_paise)) {
    return { matches: false, reason: `Spend ${spendPaise} < min ${cond.min_spend_paise}` };
  }
  if (cond.max_spend_paise != null && spendPaise > BigInt(cond.max_spend_paise)) {
    return { matches: false, reason: `Spend ${spendPaise} > max ${cond.max_spend_paise}` };
  }

  // 3. Vehicle Category Specificity (+8 pts)
  const vTypes = cond.vehicle_types || ['ALL'];
  const ctxVType = normalizeStr(context.vehicle_type);
  if (!vTypes.some((t) => normalizeStr(t) === 'all' || normalizeStr(t) === ctxVType)) {
    return { matches: false, reason: 'Vehicle type mismatch' };
  }
  if (!vTypes.includes('ALL') && ctxVType && ctxVType !== 'all') {
    score += 8;
  }

  // 4. Brand Specificity (+3 pts)
  const brands = cond.brands || ['ALL'];
  const ctxBrand = normalizeStr(context.brand_name);
  if (!brands.some((b) => normalizeStr(b) === 'all' || normalizeStr(b) === ctxBrand || ctxBrand.includes(normalizeStr(b)))) {
    return { matches: false, reason: 'Brand mismatch' };
  }
  if (!brands.includes('ALL') && ctxBrand && ctxBrand !== 'all') {
    score += 3;
  }

  // 5. Model Specificity (+20 pts)
  const models = cond.models || ['ALL'];
  const ctxModel = normalizeStr(context.model_name);
  const matchesModel = models.some(
    (m) => normalizeStr(m) === 'all' || normalizeStr(m) === ctxModel || (ctxModel && ctxModel.includes(normalizeStr(m)))
  );
  if (!matchesModel) {
    return { matches: false, reason: 'Model mismatch' };
  }
  if (!models.includes('ALL') && ctxModel && ctxModel !== 'all') {
    score += 20;
  }

  // 6. Variant Specificity (+15 pts)
  const variants = cond.variants || ['ALL'];
  const ctxVariant = normalizeStr(context.variant_name);
  if (!variants.some((v) => normalizeStr(v) === 'all' || normalizeStr(v) === ctxVariant)) {
    return { matches: false, reason: 'Variant mismatch' };
  }
  if (!variants.includes('ALL') && ctxVariant && ctxVariant !== 'all') {
    score += 15;
  }

  // 7. Branch Specificity (+10 pts)
  const branches = cond.branches || ['ALL'];
  const ctxBranch = normalizeStr(context.branch_name);
  const matchesBranch = branches.some(
    (b) => normalizeStr(b) === 'all' || normalizeStr(b) === ctxBranch || (ctxBranch && ctxBranch.includes(normalizeStr(b)))
  );
  if (!matchesBranch) {
    return { matches: false, reason: 'Branch mismatch' };
  }
  if (!branches.includes('ALL') && ctxBranch && ctxBranch !== 'all') {
    score += 10;
  }

  // 8. Tier Specificity (+5 pts)
  const tiers = cond.customer_tiers || ['ALL'];
  const ctxTier = normalizeStr(context.customer_tier || 'silver');
  if (!tiers.some((t) => normalizeStr(t) === 'all' || normalizeStr(t) === ctxTier)) {
    return { matches: false, reason: 'Tier mismatch' };
  }
  if (!tiers.includes('ALL') && ctxTier && ctxTier !== 'all') {
    score += 5;
  }

  return { matches: true, score };
}

/**
 * Pure evaluation function for ruleset execution.
 * 
 * @param {Object} context - Transaction parameters
 * @param {Object} ruleset - Validated JSON ruleset payload
 * @returns {Object} Comprehensive evaluation result & trace
 */
function evaluateRules(context, ruleset) {
  const eventType = context.event_type || 'sale';
  const spendAmount = Math.max(0, Number(context.spend_amount || 0));
  const spendPaise = BigInt(Math.round(spendAmount * 100));

  const rules = Array.isArray(ruleset.rules) ? ruleset.rules : [];
  const evaluatedTrace = [];
  const matchedCandidates = [];

  for (const rule of rules) {
    const matchRes = matchRule(rule, { ...context, event_type: eventType });
    evaluatedTrace.push({
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      priority_weight: rule.priority_weight,
      matches: matchRes.matches,
      score: matchRes.score || 0,
      reason: matchRes.reason || 'Matched criteria',
    });

    if (matchRes.matches) {
      matchedCandidates.push({
        rule,
        score: matchRes.score,
      });
    }
  }

  // Sort matched candidates by score descending
  matchedCandidates.sort((a, b) => b.score - a.score);

  if (matchedCandidates.length === 0) {
    // Default fallback calculation (1% rate, 0 discount)
    const fallbackPoints = Math.floor(spendAmount * 0.01);
    return {
      has_match: false,
      applied_rule: null,
      discount_rupees: 0,
      net_points_base_rupees: spendAmount,
      points_earned: fallbackPoints,
      bonus_points: 0,
      total_points: fallbackPoints,
      redemption_value_rupees: fallbackPoints * 0.25,
      trace: evaluatedTrace,
      reason: 'No configured rule matched; applied 1% default baseline.',
    };
  }

  const winning = matchedCandidates[0];
  const rule = winning.rule;
  const action = rule.action || {};

  // 1. Calculate Discount
  let discountPaise = 0n;
  const discAction = action.discount || { type: 'none', value: 0 };

  if (discAction.type === 'percentage') {
    const pct = Number(discAction.value || 0);
    discountPaise = (spendPaise * BigInt(Math.round(pct * 100))) / 10000n;
  } else if (discAction.type === 'flat_rupees') {
    discountPaise = BigInt(Math.round(Number(discAction.value || 0) * 100));
  }

  // Apply maximum discount cap if defined
  if (discAction.max_cap_paise != null) {
    const capPaise = BigInt(discAction.max_cap_paise);
    if (discountPaise > capPaise) {
      discountPaise = capPaise;
    }
  }

  // Discount cannot exceed gross invoice spend
  if (discountPaise > spendPaise) {
    discountPaise = spendPaise;
  }

  // 2. Compute Points Earning Base
  let pointsBasePaise = spendPaise;

  if (eventType === 'sale' && context.raw_invoice_data) {
    const salesBaseRes = calculateNetSalesBasePaise(context.raw_invoice_data);
    pointsBasePaise = salesBaseRes.net_base_paise;
  } else if (discAction.deduct_from_points_base) {
    pointsBasePaise = spendPaise > discountPaise ? spendPaise - discountPaise : 0n;
  }

  // 3. Compute Points Earned
  const earnAction = action.points_earning || {};
  const num = BigInt(earnAction.multiplier_numerator != null ? earnAction.multiplier_numerator : 1);
  const den = BigInt(earnAction.multiplier_denominator || 100);

  // Divide paise base by 100 to get rupee integer base for multiplier
  const baseRupees = pointsBasePaise / 100n;
  const earnedPoints = Number((baseRupees * num) / (den > 0n ? den : 100n));
  const bonusPoints = Number(earnAction.bonus_points || 0);
  const totalPoints = earnedPoints + bonusPoints;

  const convRate = Number(ruleset.redemption?.conversion_rate || 0.25);
  const redemptionValue = Math.round(totalPoints * convRate * 100) / 100;

  return {
    has_match: true,
    applied_rule: {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      priority_weight: rule.priority_weight,
      score: winning.score,
      event_type: rule.event_type,
    },
    discount_rupees: Number(discountPaise) / 100,
    net_points_base_rupees: Number(pointsBasePaise) / 100,
    points_earned: earnedPoints,
    bonus_points: bonusPoints,
    total_points: totalPoints,
    redemption_rate: convRate,
    redemption_value_rupees: redemptionValue,
    trace: evaluatedTrace,
    reason: `Applied "${rule.rule_name}" (Score ${winning.score}): ₹${Number(discountPaise) / 100} discount + ${totalPoints} points`,
  };
}

module.exports = {
  evaluateRules,
  calculateNetSalesBasePaise,
  matchRule,
  isExcludedCategory,
};
