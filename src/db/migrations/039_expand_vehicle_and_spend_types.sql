-- Migration: 039_expand_vehicle_and_spend_types.sql
-- Role: Principal Architect / Senior Full-Stack Engineer
-- Purpose:
--   1. Support Commercial Vehicles, Machinery & Agriculture Equipment, 2W, 4W, EV.
--   2. Support spend categories: sales, service, bodyshop, accessories, spares, gift_cards.
--   3. Support dealership-specific policy toggles (e.g. Trident only sales & service, no tiers).
--   4. Support dynamic customer priority tiers (expenses-based, points-based, amount-range).

-- 1. Drop rigid CHECK constraints on master_loyalty_rules to allow full customizability
ALTER TABLE master_loyalty_rules DROP CONSTRAINT IF EXISTS master_loyalty_rules_spend_type_check;
ALTER TABLE master_loyalty_rules DROP CONSTRAINT IF EXISTS master_loyalty_rules_priority_tier_check;
ALTER TABLE master_loyalty_rules DROP CONSTRAINT IF EXISTS master_loyalty_rules_vehicle_type_check;

-- Expand column widths for vehicle_type and spend_type
ALTER TABLE master_loyalty_rules ALTER COLUMN vehicle_type TYPE VARCHAR(64);
ALTER TABLE master_loyalty_rules ALTER COLUMN spend_type TYPE VARCHAR(64);

-- 2. Extend firms table with dealership policy configuration
ALTER TABLE firms ADD COLUMN IF NOT EXISTS modules_config JSONB DEFAULT '{
  "sales": true,
  "service": true,
  "bodyshop": true,
  "accessories": true,
  "spares": true,
  "gift_cards": true,
  "tier_policy": true
}'::jsonb;

ALTER TABLE firms ADD COLUMN IF NOT EXISTS rules_config JSONB DEFAULT '{}'::jsonb;

-- Configure Trident Automobiles with customized policies:
-- Only sales & service enabled, tier policy disabled (as requested by user)
UPDATE firms
SET modules_config = '{
  "sales": true,
  "service": true,
  "bodyshop": false,
  "accessories": false,
  "spares": false,
  "gift_cards": false,
  "tier_policy": false
}'::jsonb
WHERE tenant_id = 'trident_automobiles';

-- 3. Extend tier_rules table for dynamic Customer Priority Tiers
ALTER TABLE tier_rules ADD COLUMN IF NOT EXISTS eval_basis VARCHAR(32) DEFAULT 'expenses_based';
ALTER TABLE tier_rules ADD COLUMN IF NOT EXISTS discounts_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tier_rules ADD COLUMN IF NOT EXISTS max_expense_amount NUMERIC(12, 2);
ALTER TABLE tier_rules ADD COLUMN IF NOT EXISTS applicable_from TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tier_rules ADD COLUMN IF NOT EXISTS applicable_upto TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 years');
ALTER TABLE tier_rules ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) DEFAULT 'approved';
ALTER TABLE tier_rules ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100) DEFAULT 'Director';

-- 4. Seed Trident Automobiles specific rules into master_loyalty_rules
INSERT INTO master_loyalty_rules (
    tenant_id,
    rule_code,
    rule_name,
    description,
    scheme_type,
    spend_type,
    vehicle_type,
    brand_name,
    models,
    variants,
    branches,
    priority_tier,
    priority_weight,
    min_spend_paise,
    max_spend_paise,
    discount_type,
    discount_value,
    max_discount_paise,
    points_multiplier_numerator,
    points_multiplier_denominator,
    bonus_points,
    applicable_from,
    applicable_upto,
    approval_status,
    approved_by,
    approved_at,
    is_active
) VALUES 
(
    'trident_automobiles',
    'TRIDENT-SALE-EXSHOWROOM',
    'Trident Vehicle Sales Earning Policy',
    'Trident Automobiles loyalty points on Ex-Showroom price for new vehicle sales',
    'standard',
    'sale',
    '4W',
    'Hyundai',
    '["Creta", "Venue", "Verna", "Ioniq 5", "ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["Bengaluru Sankey Road", "Bengaluru Hosur Road", "ALL"]'::jsonb,
    'ALL',
    100,
    0,
    NULL,
    'percentage',
    0.00,
    NULL,
    1,
    100, -- 1% of Ex-Showroom price
    0,
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '5 years',
    'approved',
    'Director',
    NOW(),
    true
),
(
    'trident_automobiles',
    'TRIDENT-SERVICE-STANDARD',
    'Trident Service Routine Workshop Policy',
    'Trident Automobiles 4% loyalty points on routine service and maintenance bills',
    'standard',
    'service',
    '4W',
    'Hyundai',
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    100,
    0,
    NULL,
    'percentage',
    5.00, -- 5% service discount
    200000, -- Cap Rs. 2,000 discount
    4,
    100, -- 4% points
    0,
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '5 years',
    'approved',
    'Director',
    NOW(),
    true
)
ON CONFLICT (tenant_id, rule_code) DO NOTHING;

-- 5. Seed Commercial and Machinery & Agriculture rules for Bellad & Company
INSERT INTO master_loyalty_rules (
    tenant_id,
    rule_code,
    rule_name,
    description,
    scheme_type,
    spend_type,
    vehicle_type,
    brand_name,
    models,
    variants,
    branches,
    priority_tier,
    priority_weight,
    min_spend_paise,
    max_spend_paise,
    discount_type,
    discount_value,
    max_discount_paise,
    points_multiplier_numerator,
    points_multiplier_denominator,
    bonus_points,
    applicable_from,
    applicable_upto,
    approval_status,
    approved_by,
    approved_at,
    is_active
) VALUES 
(
    'bellad_and_company',
    'BELLAD-COMMERCIAL-SALES',
    'Commercial Heavy & Light Vehicles Ex-Showroom Policy',
    'Commercial trucks, tippers and passenger buses Ex-Showroom points and fleet discount',
    'standard',
    'sale',
    'Commercial',
    'Tata Motors Commercial',
    '["Prima", "Signa", "Ultra", "Ace EV", "ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["Hubballi Commercial", "Belagavi", "ALL"]'::jsonb,
    'ALL',
    120,
    100000000, -- Min ₹10,00,000 spend
    NULL,
    'percentage',
    2.50, -- 2.5% fleet discount
    10000000, -- Cap ₹1,00,000 discount
    1,
    100, -- 1% points
    0,
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '5 years',
    'approved',
    'Director',
    NOW(),
    true
),
(
    'bellad_and_company',
    'BELLAD-AGRI-MACHINERY-SALES',
    'Agriculture Machinery & Tractors Ex-Showroom Policy',
    'Agriculture tractors, harvesters, and implement sales points based on Ex-Showroom pricing',
    'standard',
    'sale',
    'Machinery & Agriculture',
    'Bellad Agri Tech',
    '["Tractor 50HP", "Rotavator Pro", "Power Tiller", "Harvester", "ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["Belagavi Rural", "Dharwad Agri Hub", "ALL"]'::jsonb,
    'ALL',
    120,
    30000000, -- Min ₹3,00,000 spend
    NULL,
    'percentage',
    3.00, -- 3% farmer discount
    5000000,
    1,
    100,
    0,
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '5 years',
    'approved',
    'Director',
    NOW(),
    true
),
(
    'bellad_and_company',
    'BELLAD-SPARES-GENUINE',
    'Genuine Spare Parts Counter & Workshop Policy',
    'Loyalty points on purchase of genuine OEM spare parts and consumables',
    'standard',
    'spares',
    'ALL',
    'ALL',
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    100,
    0,
    NULL,
    'percentage',
    5.00,
    500000,
    2,
    100, -- 2% points on spares
    0,
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '5 years',
    'approved',
    'Director',
    NOW(),
    true
)
ON CONFLICT (tenant_id, rule_code) DO NOTHING;
