-- Migration 049: Categorize Silver, Gold, Platinum based on expense amount and set all customers to Silver baseline

-- 1. Remove obsolete Diamond tier
DELETE FROM tier_rules WHERE tier_name = 'Diamond';

-- 2. Configure Silver, Gold, Platinum tiers with realistic automotive expense ranges
-- Slabs:
--   Silver:   ₹0 - ₹9,99,999.99 (All current customers start here)
--   Gold:     ₹10,00,000 - ₹24,99,999.99
--   Platinum: ₹25,00,000+
INSERT INTO tier_rules (
  tenant_id,
  tier_name,
  min_lifetime_points,
  min_expense_amount,
  max_expense_amount,
  eval_basis,
  benefits_json,
  multiplier,
  approval_status,
  approved_by,
  applicable_from,
  applicable_upto,
  updated_at
)
VALUES
  (
    'bellad_and_company',
    'Silver',
    0,
    0.00,
    999999.99,
    'expenses_based',
    '{"description": "Silver tier: Baseline tier for all customers (₹0 - ₹9,99,999 cumulative expense)"}',
    100,
    'approved',
    'Director',
    '2026-04-01 00:00:00+00',
    '2036-12-31 23:59:59+00',
    NOW()
  ),
  (
    'bellad_and_company',
    'Gold',
    5000,
    1000000.00,
    2499999.99,
    'expenses_based',
    '{"description": "Gold tier: Cumulative customer expense ₹10,00,000 - ₹24,99,999"}',
    100,
    'approved',
    'Director',
    '2026-04-01 00:00:00+00',
    '2036-12-31 23:59:59+00',
    NOW()
  ),
  (
    'bellad_and_company',
    'Platinum',
    15000,
    2500000.00,
    NULL,
    'expenses_based',
    '{"description": "Platinum tier: Cumulative customer expense ₹25,00,000 and above"}',
    100,
    'approved',
    'Director',
    '2026-04-01 00:00:00+00',
    '2036-12-31 23:59:59+00',
    NOW()
  )
ON CONFLICT (tenant_id, tier_name) DO UPDATE
  SET min_expense_amount = EXCLUDED.min_expense_amount,
      max_expense_amount = EXCLUDED.max_expense_amount,
      eval_basis = EXCLUDED.eval_basis,
      benefits_json = EXCLUDED.benefits_json,
      multiplier = EXCLUDED.multiplier,
      updated_at = NOW();

-- Also ensure any other tenants have matching expense thresholds
UPDATE tier_rules
SET min_expense_amount = CASE
  WHEN tier_name = 'Platinum' THEN 2500000.00
  WHEN tier_name = 'Gold' THEN 1000000.00
  ELSE 0.00
END,
max_expense_amount = CASE
  WHEN tier_name = 'Silver' THEN 999999.99
  WHEN tier_name = 'Gold' THEN 2499999.99
  ELSE NULL
END,
eval_basis = 'expenses_based'
WHERE tenant_id != 'bellad_and_company';

-- 3. Set all existing customer tier snapshots to Silver baseline as requested
UPDATE customer_tier_snapshot
SET current_tier = 'Silver',
    updated_at = NOW();
