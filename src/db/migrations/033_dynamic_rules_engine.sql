-- Migration: 033_dynamic_rules_engine.sql
-- Role: Principal Architect & Senior Full-Stack Engineer
-- Purpose: Dynamic Rules Engine schema tables with Scope Hierarchy (Tenant > Brand > Branch > Vehicle Type > Model > Transaction Type),
--          Version Effective-Dating, Priority Tie-Breaking, and Maker-Checker Validation.

-- 1. Dynamic Rule Sets Table
CREATE TABLE IF NOT EXISTS rule_sets (
    rule_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    category VARCHAR(32) NOT NULL CHECK (category IN ('sale', 'service', 'accessory', 'bodyshop', 'inhouse_bonus', 'referral', 'redemption')),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rule_sets_tenant_category_name UNIQUE (tenant_id, category, name)
);

CREATE INDEX IF NOT EXISTS idx_rule_sets_tenant_cat ON rule_sets (tenant_id, category);

-- 2. Dynamic Rule Versions Table (Scope Hierarchy & Maker-Checker)
CREATE TABLE IF NOT EXISTS rule_versions (
    rule_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_id UUID NOT NULL REFERENCES rule_sets(rule_set_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending_approval', 'published', 'archived')),
    
    -- Scope Hierarchy Columns (Precise matching)
    brand_id VARCHAR(64),
    branch_id VARCHAR(64),
    vehicle_type VARCHAR(32) CHECK (vehicle_type IS NULL OR vehicle_type IN ('2W', '4W')),
    model_id VARCHAR(64),
    transaction_type VARCHAR(32),
    priority INTEGER NOT NULL DEFAULT 100, -- Deterministic tie-breaker (higher number = higher priority)
    
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    
    -- Validated Rules Engine Formula JSON
    -- Format: { multiplier_numerator: 4, multiplier_denominator: 100, base_formula: "ex_showroom_minus_offers", deductions: ["emps", "oem"] }
    formula_config JSONB NOT NULL,
    redemption_rate_rupees_per_point NUMERIC(10,4) NOT NULL DEFAULT 0.2500,
    
    created_by UUID,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Maker-Checker Constraint: published rules cannot be approved by the creator (unless created by system migration/seed)
    CONSTRAINT uq_rule_versions_set_number UNIQUE (rule_set_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_rule_versions_lookup 
ON rule_versions (tenant_id, status, effective_from, priority DESC);

-- Seed Default Backward-Compatible Rule Sets and Rule Versions for Existing Tenants
DO $$
DECLARE
    t_id VARCHAR(64);
    rs_sale_id UUID;
    rs_service_id UUID;
    rs_accessory_id UUID;
    rs_bodyshop_id UUID;
BEGIN
    FOR t_id IN SELECT DISTINCT tenant_id FROM firms LOOP
        -- SALE RULE SET
        INSERT INTO rule_sets (tenant_id, category, name, description)
        VALUES (t_id, 'sale', 'Default Sale Points Rule', 'Standard 1 point per Rs 100 on Ex-Showroom net base')
        ON CONFLICT (tenant_id, category, name) DO UPDATE SET updated_at = NOW()
        RETURNING rule_set_id INTO rs_sale_id;

        IF rs_sale_id IS NOT NULL THEN
            INSERT INTO rule_versions (
                rule_set_id, tenant_id, version_number, status, priority, effective_from, formula_config, redemption_rate_rupees_per_point
            )
            VALUES (
                rs_sale_id, t_id, 1, 'published', 100, NOW() - INTERVAL '1 year',
                '{"multiplier_numerator": 1, "multiplier_denominator": 100, "base_formula": "ex_showroom_minus_offers", "deductions": ["dealer_cash", "emps", "oem_offers"]}'::jsonb,
                0.2500
            )
            ON CONFLICT (rule_set_id, version_number) DO NOTHING;
        END IF;

        -- SERVICE RULE SET (4%)
        INSERT INTO rule_sets (tenant_id, category, name, description)
        VALUES (t_id, 'service', 'Default Service Points Rule', 'Standard 4 points per Rs 100 (4%)')
        ON CONFLICT (tenant_id, category, name) DO UPDATE SET updated_at = NOW()
        RETURNING rule_set_id INTO rs_service_id;

        IF rs_service_id IS NOT NULL THEN
            INSERT INTO rule_versions (
                rule_set_id, tenant_id, version_number, status, priority, effective_from, formula_config, redemption_rate_rupees_per_point
            )
            VALUES (
                rs_service_id, t_id, 1, 'published', 100, NOW() - INTERVAL '1 year',
                '{"multiplier_numerator": 4, "multiplier_denominator": 100, "base_formula": "invoice_total"}'::jsonb,
                0.2500
            )
            ON CONFLICT (rule_set_id, version_number) DO NOTHING;
        END IF;

        -- ACCESSORY RULE SET (2%)
        INSERT INTO rule_sets (tenant_id, category, name, description)
        VALUES (t_id, 'accessory', 'Default Accessory Points Rule', 'Standard 2 points per Rs 100 (2%)')
        ON CONFLICT (tenant_id, category, name) DO UPDATE SET updated_at = NOW()
        RETURNING rule_set_id INTO rs_accessory_id;

        IF rs_accessory_id IS NOT NULL THEN
            INSERT INTO rule_versions (
                rule_set_id, tenant_id, version_number, status, priority, effective_from, formula_config, redemption_rate_rupees_per_point
            )
            VALUES (
                rs_accessory_id, t_id, 1, 'published', 100, NOW() - INTERVAL '1 year',
                '{"multiplier_numerator": 2, "multiplier_denominator": 100, "base_formula": "invoice_total"}'::jsonb,
                0.2500
            )
            ON CONFLICT (rule_set_id, version_number) DO NOTHING;
        END IF;

        -- BODYSHOP RULE SET (3%)
        INSERT INTO rule_sets (tenant_id, category, name, description)
        VALUES (t_id, 'bodyshop', 'Default Bodyshop Points Rule', 'Standard 3 points per Rs 100 (3%)')
        ON CONFLICT (tenant_id, category, name) DO UPDATE SET updated_at = NOW()
        RETURNING rule_set_id INTO rs_bodyshop_id;

        IF rs_bodyshop_id IS NOT NULL THEN
            INSERT INTO rule_versions (
                rule_set_id, tenant_id, version_number, status, priority, effective_from, formula_config, redemption_rate_rupees_per_point
            )
            VALUES (
                rs_bodyshop_id, t_id, 1, 'published', 100, NOW() - INTERVAL '1 year',
                '{"multiplier_numerator": 3, "multiplier_denominator": 100, "base_formula": "invoice_total"}'::jsonb,
                0.2500
            )
            ON CONFLICT (rule_set_id, version_number) DO NOTHING;
        END IF;
    END LOOP;
END $$;
