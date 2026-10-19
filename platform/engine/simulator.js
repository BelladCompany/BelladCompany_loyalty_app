/**
 * Visual Rule Simulator Service
 * 
 * Takes arbitrary customer profile + invoice context + ruleset and produces
 * an audit-grade step-by-step trace showing which rules matched, which were eliminated,
 * and the exact breakdown of discounts and point earnings.
 */

const { evaluateRules } = require('./evaluator');

class RuleSimulator {
  /**
   * Simulates evaluation and produces an international-standard breakdown report.
   * 
   * @param {Object} params
   * @param {Object} params.customer_profile - e.g. { customer_id, current_tier, lifetime_points }
   * @param {Object} params.transaction_context - e.g. { event_type, spend_amount, model_name, branch_name }
   * @param {Object} params.ruleset - Validated JSON ruleset payload
   * @returns {Object} Simulation outcome with visual step trace
   */
  static simulate({ customer_profile = {}, transaction_context = {}, ruleset = {} }) {
    const startTime = Date.now();

    const enrichedContext = {
      ...transaction_context,
      customer_tier: customer_profile.current_tier || transaction_context.customer_tier || 'Silver',
    };

    const outcome = evaluateRules(enrichedContext, ruleset);
    const executionDurationMs = Date.now() - startTime;

    // Build human-friendly trace steps
    const steps = [];

    // Step 1: Input Summary
    steps.push({
      step: 1,
      title: 'Context Normalization',
      status: 'complete',
      details: `Evaluated ${enrichedContext.event_type?.toUpperCase()} transaction for ₹${Number(enrichedContext.spend_amount || 0).toLocaleString('en-IN')}`,
      metadata: {
        customer_tier: enrichedContext.customer_tier,
        brand: enrichedContext.brand_name || 'ALL',
        model: enrichedContext.model_name || 'ALL',
        branch: enrichedContext.branch_name || 'ALL',
      },
    });

    // Step 2: Rule Candidate Filtering & Scoring
    const matchedCount = outcome.trace.filter((t) => t.matches).length;
    const eliminatedCount = outcome.trace.length - matchedCount;

    steps.push({
      step: 2,
      title: 'Rule Matching & Specificity Scoring',
      status: 'complete',
      details: `${matchedCount} rule(s) matched criteria; ${eliminatedCount} rule(s) eliminated`,
      candidates: outcome.trace.map((t) => ({
        rule_id: t.rule_id,
        rule_name: t.rule_name,
        is_match: t.matches,
        score: t.score,
        reason: t.reason,
      })),
    });

    // Step 3: Calculation & Outcome
    steps.push({
      step: 3,
      title: 'Financial & Points Calculation',
      status: 'complete',
      details: outcome.has_match
        ? `Winning rule "${outcome.applied_rule.rule_name}" awarded ₹${outcome.discount_rupees.toLocaleString('en-IN')} discount and ${outcome.total_points.toLocaleString('en-IN')} points`
        : 'No rule matched; standard default applied',
      breakdown: {
        discount_applied_rupees: outcome.discount_rupees,
        net_points_base_rupees: outcome.net_points_base_rupees,
        base_points_earned: outcome.points_earned,
        bonus_points_earned: outcome.bonus_points,
        total_points_earned: outcome.total_points,
        redemption_cash_value_rupees: outcome.redemption_value_rupees,
      },
    });

    return {
      simulation_id: `SIM-${Date.now()}`,
      execution_ms: executionDurationMs,
      applied_rule: outcome.applied_rule,
      summary: {
        gross_invoice: Number(transaction_context.spend_amount || 0),
        discount_rupees: outcome.discount_rupees,
        net_payable_rupees: Math.max(0, Number(transaction_context.spend_amount || 0) - outcome.discount_rupees),
        total_points_earned: outcome.total_points,
        points_rupee_value: outcome.redemption_value_rupees,
      },
      steps,
      raw_outcome: outcome,
    };
  }
}

module.exports = RuleSimulator;
