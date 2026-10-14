-- Migration: 037_master_editor_rules_brain.sql
-- Role: Principal Architect / Senior Full-Stack Engineer
-- Purpose: Master Editor Table ("The App Brain") supporting dynamic rule generation,
--          2W/4W vehicle models, variants, branches, spend types (sale, service, accessories, bodyshop, redemption),
--          scheme types (gift cards, referral, inhouse exchange, inhouse insurance, inhouse finance, google rating, etc.),
--          customer priority tiers (silver, gold, platinum), date ranges (applicable from -> upto),
--          discount ranges/logics, points earning logics, and Director approval workflows.

CREATE TABLE IF NOT EXISTS master_loyalty_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
    rule_code VARCHAR(64) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scheme Type
    -- gift cards, referral, inhouse exchange, inhouse insurance, inhouse finance, google rating, festive, standard, corporate
    scheme_type VARCHAR(64) NOT NULL CHECK (scheme_type IN (
        'gift_cards',
        'referral',
        'inhouse_exchange',
        'inhouse_insurance',
        'inhouse_finance',
        'google_rating',
        'festive',
        'standard',
        'corporate'
    )),
    
    -- Spend Type
    -- service, sale, accessories, bodyshop, redemption
    spend_type VARCHAR(32) NOT NULL CHECK (spend_type IN (
        'sale',
        'service',
        'accessories',
        'bodyshop',
        'redemption'
    )),
    
    -- Vehicle Category Selector: 2W, 4W, or ALL
    vehicle_type VARCHAR(10) NOT NULL DEFAULT 'ALL' CHECK (vehicle_type IN ('2W', '4W', 'ALL')),
    
    -- Target Brand, Models, Variants
    brand_name VARCHAR(100) DEFAULT 'ALL',
    models JSONB NOT NULL DEFAULT '["ALL"]'::jsonb, -- e.g. ["Splendor", "Nexon", "Curvv"] or ["ALL"]
    variants JSONB NOT NULL DEFAULT '["ALL"]'::jsonb, -- e.g. ["XZ+", "Dark Edition"] or ["ALL"]
    
    -- Branch Target
    branches JSONB NOT NULL DEFAULT '["ALL"]'::jsonb, -- e.g. ["Hubballi", "Bengaluru"] or ["ALL"]
    
    -- Priority / Customer Tier Slab: silver, gold, platinum, or ALL
    priority_tier VARCHAR(32) NOT NULL DEFAULT 'ALL' CHECK (priority_tier IN ('silver', 'gold', 'platinum', 'ALL')),
    priority_weight INTEGER NOT NULL DEFAULT 100, -- Higher integer = higher priority in tie-break
    
    -- Spend Amount Criteria
    min_spend_paise BIGINT NOT NULL DEFAULT 0,
    max_spend_paise BIGINT, -- NULL for unlimited
    
    -- Discount Ranges & Logics
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'flat_amount', 'none')),
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0, -- e.g. 30.00 for 30% or 5000.00 for Rs.5000
    max_discount_paise BIGINT, -- Maximum cap on discount (e.g. max Rs 50,000)
    discount_deductible_from_base BOOLEAN NOT NULL DEFAULT true, -- Deduct discount from points base before calculating points
    
    -- Points Earning Logics
    points_multiplier_numerator INTEGER NOT NULL DEFAULT 1,
    points_multiplier_denominator INTEGER NOT NULL DEFAULT 100, -- 1/100 = 1 pt per Rs 100 (1%)
    bonus_points INTEGER NOT NULL DEFAULT 0, -- Flat one-time points (e.g. 500 pts for Google Rating or Exchange)
    redemption_rate_rupees_per_point NUMERIC(10,4) NOT NULL DEFAULT 0.2500,
    
    -- Date Range Windows
    applicable_from TIMESTAMPTZ NOT NULL,
    applicable_upto TIMESTAMPTZ NOT NULL,
    
    -- Governance & Approvals
    approval_status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (approval_status IN (
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'archived'
    )),
    approved_by VARCHAR(100), -- Director name or ID
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    created_by VARCHAR(100) DEFAULT 'admin',
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_master_rules_tenant_code UNIQUE (tenant_id, rule_code)
);

CREATE INDEX IF NOT EXISTS idx_master_rules_lookup 
ON master_loyalty_rules (tenant_id, is_active, approval_status, applicable_from, applicable_upto);

CREATE INDEX IF NOT EXISTS idx_master_rules_hierarchy
ON master_loyalty_rules (scheme_type, spend_type, vehicle_type, priority_tier);

-- 2. Master Rule Audit Log Table
CREATE TABLE IF NOT EXISTS master_loyalty_rule_audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES master_loyalty_rules(rule_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL, -- created, updated, approved, rejected, toggled_active, simulated
    performed_by VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Seed Initial Director-Configured Master Rules
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
    'HERO-2W-NOV-DEC-FESTIVE',
    'Hero Two-Wheeler Year-End Festive Drive',
    'Director Special: Up to 30% discount on Hero models with 1.5% points earning',
    'festive',
    'sale',
    '2W',
    'Hero',
    '["Splendor", "HF Deluxe", "Passion", "Glamour", "Xpulse"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    300,
    5000000, -- Min Rs 50,000 spend
    'percentage',
    30.00,
    1500000, -- Max Rs 15,000 discount
    3,
    200, -- 1.5% points
    500, -- 500 festive bonus points
    '2026-11-01 00:00:00+05:30',
    '2026-12-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
),
(
    'bellad_and_company',
    'TATA-4W-GOLD-PLATINUM-SERVICE',
    'Tata Passenger 4W Premium Service Privilege',
    'Enhanced 5% service points for Gold and Platinum tiers with 10% labour discount',
    'standard',
    'service',
    '4W',
    'Tata Motors',
    '["Nexon", "Curvv", "Harrier", "Safari", "Altroz", "Punch"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'gold',
    250,
    500000, -- Min Rs 5,000 spend
    'percentage',
    10.00,
    500000,
    5,
    100, -- 5% points
    250,
    '2026-01-01 00:00:00+05:30',
    '2026-12-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
),
(
    'bellad_and_company',
    'GOOGLE-RATING-BOOST',
    'Customer Google 5-Star Review Reward',
    'Instant 250 loyalty points on verified 5-star Google Review across branches',
    'google_rating',
    'service',
    'ALL',
    'ALL',
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    150,
    0,
    'none',
    0,
    NULL,
    0,
    100,
    250,
    '2026-01-01 00:00:00+05:30',
    '2027-12-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
),
(
    'bellad_and_company',
    'INHOUSE-EXCHANGE-BONUS',
    'In-House Old Vehicle Exchange Loyalty Top-Up',
    'Special exchange bonus: Rs 5,000 flat discount + 1000 loyalty points for new sales',
    'inhouse_exchange',
    'sale',
    'ALL',
    'ALL',
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    200,
    10000000,
    'flat_amount',
    5000.00,
    500000,
    1,
    100,
    1000,
    '2026-01-01 00:00:00+05:30',
    '2027-03-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
),
(
    'bellad_and_company',
    'INHOUSE-INSURANCE-RENEWAL',
    'In-House Motor Insurance Renewal Loyalty Reward',
    '2% points on in-house policy premium with 5% discount on add-ons',
    'inhouse_insurance',
    'service',
    'ALL',
    'ALL',
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    180,
    1000000,
    'percentage',
    5.00,
    200000,
    2,
    100,
    300,
    '2026-01-01 00:00:00+05:30',
    '2027-12-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
),
(
    'bellad_and_company',
    'INHOUSE-FINANCE-SCHEME',
    'In-House Finance & Loan Disbursement Scheme',
    'Special 1500 points crediting upon approved in-house vehicle finance',
    'inhouse_finance',
    'sale',
    'ALL',
    'ALL',
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    190,
    20000000,
    'none',
    0,
    NULL,
    1,
    100,
    1500,
    '2026-01-01 00:00:00+05:30',
    '2027-12-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
),
(
    'bellad_and_company',
    'GIFT-CARDS-FESTIVE-MULTIPLIER',
    'Gift Card Purchase & Redemption Accelerator',
    '2.5% points rewards on all festive dealership gift card vouchers',
    'gift_cards',
    'redemption',
    'ALL',
    'ALL',
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    210,
    50000,
    'none',
    0,
    NULL,
    5,
    200, -- 2.5% points
    100,
    '2026-01-01 00:00:00+05:30',
    '2027-12-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
),
(
    'bellad_and_company',
    'REFERRAL-SUPER-DRIVE',
    'High-Value Customer Referral Campaign',
    '2000 bonus points on confirmed purchase referral for four-wheelers',
    'referral',
    'sale',
    '4W',
    'ALL',
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    '["ALL"]'::jsonb,
    'ALL',
    220,
    50000000,
    'none',
    0,
    NULL,
    0,
    100,
    2000,
    '2026-01-01 00:00:00+05:30',
    '2027-12-31 23:59:59+05:30',
    'approved',
    'Director (Executive)',
    NOW(),
    true
)
ON CONFLICT (tenant_id, rule_code) DO UPDATE
SET updated_at = NOW();
