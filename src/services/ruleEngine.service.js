/**
 * Dynamic Rule Engine Service
 * automobile-loyalty-backend
 * 
 * Role: Senior Full-Stack Engineer / Principal Architect
 * Purpose: Evaluates rules dynamically from DB rule_sets and rule_versions based on scope hierarchy:
 *          Tenant > Brand > Branch > Vehicle Type (2W/4W) > Model > Transaction Type
 */
const { pool } = require('../config/db');
const VehiclePointsEngine = require('./vehiclePointsEngine.service');

class RuleEngineService {
  /**
   * Resolves the highest-priority active rule version matching the context hierarchy.
   * 
   * Scope Precedence Ordering:
   * 1. Match count of exact scope matches (Brand, Branch, Vehicle Type, Model, Transaction Type)
   * 2. Priority integer (higher number = higher priority)
   * 3. Version number DESC (latest version)
   */
  static async resolveRuleVersion({ tenant_id, category, brand_id, branch_id, vehicle_type, model_id, transaction_type, client = pool }) {
    const query = `
      SELECT rv.*, rs.name AS rule_set_name, rs.category
      FROM rule_versions rv
      JOIN rule_sets rs ON rv.rule_set_id = rs.rule_set_id
      WHERE rv.tenant_id = $1
        AND rs.category = $2
        AND rs.is_active = true
        AND rv.status = 'published'
        AND rv.effective_from <= NOW()
        AND (rv.effective_to IS NULL OR rv.effective_to >= NOW())
        AND (rv.brand_id IS NULL OR rv.brand_id = $3)
        AND (rv.branch_id IS NULL OR rv.branch_id = $4)
        AND (rv.vehicle_type IS NULL OR rv.vehicle_type = $5)
        AND (rv.model_id IS NULL OR rv.model_id = $6)
        AND (rv.transaction_type IS NULL OR rv.transaction_type = $7)
      ORDER BY 
        (
          (CASE WHEN rv.brand_id IS NOT NULL THEN 16 ELSE 0 END) +
          (CASE WHEN rv.branch_id IS NOT NULL THEN 8 ELSE 0 END) +
          (CASE WHEN rv.vehicle_type IS NOT NULL THEN 4 ELSE 0 END) +
          (CASE WHEN rv.model_id IS NOT NULL THEN 2 ELSE 0 END) +
          (CASE WHEN rv.transaction_type IS NOT NULL THEN 1 ELSE 0 END)
        ) DESC,
        rv.priority DESC,
        rv.version_number DESC
      LIMIT 1;
    `;

    const res = await client.query(query, [
      tenant_id,
      category,
      brand_id || null,
      branch_id || null,
      vehicle_type || null,
      model_id || null,
      transaction_type || null,
    ]);

    return res.rows[0] || null;
  }

  /**
   * Calculates points using either resolved dynamic rule version or safe backward-compatible defaults.
   */
  static async calculatePoints({
    tenant_id,
    category,
    amount,
    invoice_data = {},
    brand_id,
    branch_id,
    vehicle_type,
    model_id,
    transaction_type,
    client = pool,
  }) {
    const activeCategory = (category || 'sale').toLowerCase();
    const ruleVersion = await this.resolveRuleVersion({
      tenant_id,
      category: activeCategory,
      brand_id,
      branch_id,
      vehicle_type,
      model_id,
      transaction_type,
      client,
    });

    if (activeCategory === 'sale' && invoice_data && invoice_data.ex_showroom_price != null) {
      const rateConfig = ruleVersion ? ruleVersion.formula_config : { multiplier_numerator: 1, multiplier_denominator: 100 };
      const calcResult = VehiclePointsEngine.calculatePoints(invoice_data, rateConfig);
      return {
        points: calcResult.points,
        points_base: calcResult.points_base,
        rule_version_id: ruleVersion ? ruleVersion.rule_version_id : null,
        redemption_rate: ruleVersion ? Number(ruleVersion.redemption_rate_rupees_per_point) : 0.2500,
        reason_text: calcResult.reason_text,
        calculation_breakdown: calcResult,
      };
    }

    // Standard service / accessory / bodyshop / bonus calculation
    let num = 1n;
    let den = 100n;

    const defaultRatios = {
      sale: { num: 1n, den: 100n },
      service: { num: 4n, den: 100n },
      accessory: { num: 2n, den: 100n },
      bodyshop: { num: 3n, den: 100n },
    };

    if (defaultRatios[activeCategory]) {
      num = defaultRatios[activeCategory].num;
      den = defaultRatios[activeCategory].den;
    }

    if (ruleVersion && ruleVersion.formula_config) {
      const cfg = ruleVersion.formula_config;
      if (cfg.multiplier_numerator != null && cfg.multiplier_denominator != null) {
        num = BigInt(cfg.multiplier_numerator);
        den = BigInt(cfg.multiplier_denominator);
      }
    }

    if (den === 0n) {
      throw new Error('Invalid point rule: denominator cannot be zero');
    }

    const amt = BigInt(amount || 0);
    const points = Number((amt * num) / den);

    return {
      points,
      points_base: Number(amount || 0),
      rule_version_id: ruleVersion ? ruleVersion.rule_version_id : null,
      redemption_rate: ruleVersion ? Number(ruleVersion.redemption_rate_rupees_per_point) : 0.2500,
      reason_text: `${activeCategory.toUpperCase()} transaction earning dynamic calculation`,
    };
  }
}

module.exports = RuleEngineService;
