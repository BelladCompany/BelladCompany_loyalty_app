-- Migration: 038_dynamic_master_editor_custom_schemes.sql
-- Role: Principal Architect / Senior Full-Stack Engineer
-- Purpose: Support dynamic custom schemes (e.g. 'xyz', 'mg_exchange', 'ev_drive'),
--          support all brands (MG, Tata, Hero, Mahindra, etc.), custom models,
--          custom vehicle categories (EV, 2W, 4W, ALL), custom branches (Belagavi, Hubballi, etc.),
--          and dynamic custom scheme registration without CHECK constraint failures.

-- 1. Drop rigid CHECK constraint on scheme_type to allow ANY custom scheme name entered by Director
ALTER TABLE master_loyalty_rules DROP CONSTRAINT IF EXISTS master_loyalty_rules_scheme_type_check;

-- 2. Drop rigid CHECK constraint on vehicle_type to allow 'EV', '3W', 'Commercial', '2W', '4W', 'ALL', or any category
ALTER TABLE master_loyalty_rules DROP CONSTRAINT IF EXISTS master_loyalty_rules_vehicle_type_check;

-- 3. Dynamic Registered Schemes Catalog (stores Director-added custom schemes)
CREATE TABLE IF NOT EXISTS master_custom_schemes (
    scheme_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
    scheme_code VARCHAR(64) NOT NULL UNIQUE,
    scheme_name VARCHAR(128) NOT NULL,
    description TEXT,
    created_by VARCHAR(64) DEFAULT 'Director',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed existing schemes and example custom scheme 'xyz'
INSERT INTO master_custom_schemes (tenant_id, scheme_code, scheme_name, description) VALUES
  ('bellad_and_company', 'festive', 'Festive Offer Campaigns', 'Seasonal high-volume festive discount and reward drives'),
  ('bellad_and_company', 'inhouse_exchange', 'In-House Vehicle Exchange', 'Bonus points and exchange benefits for old vehicle trade-ins'),
  ('bellad_and_company', 'inhouse_insurance', 'In-House Insurance Renewal', 'Rewards for motor insurance renewals via dealership'),
  ('bellad_and_company', 'inhouse_finance', 'In-House Auto Finance', 'Incentives for financing via captive dealership partners'),
  ('bellad_and_company', 'google_rating', 'Google 5-Star Review Rewards', 'Automated credits for customer ratings and testimonials'),
  ('bellad_and_company', 'gift_cards', 'Gift Cards & Vouchers', 'Redeemable electronic showroom and service gift cards'),
  ('bellad_and_company', 'referral', 'Customer Referrals', 'Advocacy reward points when friends/family purchase'),
  ('bellad_and_company', 'standard', 'Standard Baseline Rate', 'Everyday earning and redemption policies'),
  ('bellad_and_company', 'corporate', 'Corporate & Fleet Partners', 'Institutional schemes for bulk and corporate clients'),
  ('bellad_and_company', 'xyz', 'Director Custom Scheme XYZ', 'Special Director scheme customizable for any brand, branch, model or bodyshop')
ON CONFLICT (scheme_code) DO NOTHING;

-- Seed sample Director rule matching the exact user scenario:
-- "for MG model EV for bodyshop only give 40% discount for belagavi branch"
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
) VALUES (
    'bellad_and_company',
    'MG-EV-BODYSHOP-BELAGAVI-40',
    'MG EV Bodyshop 40% Belagavi Branch Campaign',
    'Special 40% discount on bodyshop repairs for MG EV models exclusively at Belagavi branch under custom scheme XYZ',
    'xyz',
    'bodyshop',
    'EV',
    'MG Motors',
    '["MG ZS EV", "Comet EV", "Windsor EV", "EV", "ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["Belagavi", "Belagavi Central", "Belgaum", "ALL"]'::jsonb,
    'ALL',
    200,
    0,
    NULL,
    'percentage',
    40.00,
    5000000, -- Up to ₹50,000 cap
    1,
    100,
    500, -- 500 bonus points
    '2026-01-01 00:00:00+05:30',
    '2027-12-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
) ON CONFLICT (tenant_id, rule_code) DO UPDATE SET
    discount_value = EXCLUDED.discount_value,
    is_active = true;
