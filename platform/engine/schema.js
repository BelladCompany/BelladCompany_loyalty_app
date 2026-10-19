const { z } = require('zod');

/**
 * Validation Schemas for White-Label Loyalty Platform Rulesets
 * Conforms strictly to Enterprise Draft-2020-12 Standards
 */

const RedemptionConfigSchema = z.object({
  conversion_rate: z.number().positive().default(0.25),
  points_per_rupee: z.number().int().positive().default(4),
  min_points_to_redeem: z.number().int().min(0).default(100),
  max_discount_percentage: z.number().min(1).max(100).default(100),
  lock_period_months: z.number().int().min(0).default(12),
  lock_exempt_categories: z.array(z.string()).default(['accessories', 'accessory']),
  expiry_period_months: z.number().int().positive().default(24),
  reset_expiry_on_activity: z.boolean().default(true),
});

const TierRuleSchema = z.object({
  tier_name: z.string().min(1),
  priority: z.number().int().min(0),
  eval_basis: z.enum(['expense_paise', 'lifetime_points']).default('expense_paise'),
  min_metric_value: z.number().int().min(0),
  points_multiplier: z.number().min(0).default(1.0),
  perks: z.array(z.string()).default([]),
});

const ConditionCriteriaSchema = z.object({
  vehicle_types: z.array(z.string()).default(['ALL']),
  brands: z.array(z.string()).default(['ALL']),
  models: z.array(z.string()).default(['ALL']),
  variants: z.array(z.string()).default(['ALL']),
  branches: z.array(z.string()).default(['ALL']),
  customer_tiers: z.array(z.string()).default(['ALL']),
  min_spend_paise: z.number().int().min(0).default(0),
  max_spend_paise: z.number().int().nullable().optional(),
  date_window: z
    .object({
      from: z.string().datetime().optional().nullable(),
      to: z.string().datetime().optional().nullable(),
    })
    .optional()
    .nullable(),
});

const RuleActionSchema = z.object({
  discount: z
    .object({
      type: z.enum(['none', 'percentage', 'flat_rupees']).default('none'),
      value: z.number().min(0).default(0),
      max_cap_paise: z.number().int().nullable().optional(),
      deduct_from_points_base: z.boolean().default(true),
    })
    .default({ type: 'none', value: 0, deduct_from_points_base: true }),
  points_earning: z
    .object({
      formula_basis: z
        .enum(['net_ex_showroom', 'bill_amount', 'cash_paid'])
        .default('bill_amount'),
      multiplier_numerator: z.number().int().min(0).default(1),
      multiplier_denominator: z.number().int().positive().default(100),
      bonus_points: z.number().int().min(0).default(0),
      rounding: z.enum(['floor', 'round', 'ceil']).default('floor'),
    })
    .default({
      formula_basis: 'bill_amount',
      multiplier_numerator: 1,
      multiplier_denominator: 100,
      bonus_points: 0,
      rounding: 'floor',
    }),
});

const LoyaltyRuleSchema = z.object({
  rule_id: z.string().min(1),
  rule_name: z.string().min(1),
  priority_weight: z.number().int().min(1).max(1000).default(100),
  event_type: z.enum(['sale', 'service', 'accessory', 'bodyshop', 'referral', 'bonus']),
  is_active: z.boolean().default(true),
  stackable: z.boolean().default(false),
  conditions: ConditionCriteriaSchema.default({}),
  action: RuleActionSchema,
});

const RulesetPayloadSchema = z.object({
  version: z.number().int().positive(),
  tenant_id: z.string().min(1),
  currency: z.string().default('INR'),
  redemption: RedemptionConfigSchema,
  tiers: z.array(TierRuleSchema).default([]),
  rules: z.array(LoyaltyRuleSchema).default([]),
});

module.exports = {
  RedemptionConfigSchema,
  TierRuleSchema,
  ConditionCriteriaSchema,
  RuleActionSchema,
  LoyaltyRuleSchema,
  RulesetPayloadSchema,
};
