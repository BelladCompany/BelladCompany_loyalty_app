-- Migration: 040_white_label_platform_core.sql
-- Role: Principal Software Architect & Lead Product Designer
-- Standard: Enterprise / International Tier Multi-Tenant White-Label Engine
-- Purpose:
--   1. Create tenant_loyalty_rule_versions for immutable versioned rulesets (JSON Schema).
--   2. Create tenant_branding_configs for per-tenant branding (logos, colors, i18n).
--   3. Create tenant_rule_audit_trail for tracking who changed what, when, and diffs.
--   4. Seed Bellad & Company (Tenant #1) with baseline Version 1 (100% current logic parity).
--   5. Establish PostgreSQL NOTIFY channel trigger on ruleset publishing.

-- 1. TENANT LOYALTY RULE VERSIONS (Draft -> Simulate -> Publish -> Rollback)
CREATE TABLE IF NOT EXISTS tenant_loyalty_rule_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'pending_approval',
        'published',
        'archived'
    )),
    ruleset_payload JSONB NOT NULL,
    checksum VARCHAR(64),
    published_by VARCHAR(100),
    published_at TIMESTAMPTZ,
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    release_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_rule_version UNIQUE (tenant_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_tenant_rule_versions_lookup
ON tenant_loyalty_rule_versions (tenant_id, is_active, status);

-- 2. TENANT BRANDING & STUDIO CONFIGURATION
CREATE TABLE IF NOT EXISTS tenant_branding_configs (
    branding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL UNIQUE REFERENCES firms(tenant_id) ON DELETE CASCADE,
    portal_title VARCHAR(255) NOT NULL DEFAULT 'Dealership Loyalty Rewards',
    logo_url TEXT,
    primary_color VARCHAR(16) NOT NULL DEFAULT '#0F172A', -- Slate 900
    accent_color VARCHAR(16) NOT NULL DEFAULT '#2563EB',  -- Electric Cobalt
    custom_domain VARCHAR(255),
    i18n_default_language VARCHAR(10) NOT NULL DEFAULT 'en-IN',
    supported_languages JSONB NOT NULL DEFAULT '["en-IN", "kn-IN"]'::jsonb,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TENANT RULE AUDIT TRAIL
CREATE TABLE IF NOT EXISTS tenant_rule_audit_trail (
    audit_id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    version_id UUID REFERENCES tenant_loyalty_rule_versions(version_id) ON DELETE SET NULL,
    version_number INTEGER,
    action VARCHAR(32) NOT NULL, -- draft_created, draft_updated, simulated, published, rolled_back
    performed_by VARCHAR(100) NOT NULL,
    diff_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_audit_trail_tenant
ON tenant_rule_audit_trail (tenant_id, created_at DESC);

-- 4. SEED INITIAL BRANDING FOR BELLAD & COMPANY (TENANT #1)
INSERT INTO tenant_branding_configs (
    tenant_id,
    portal_title,
    primary_color,
    accent_color,
    i18n_default_language,
    supported_languages,
    contact_email,
    contact_phone
) VALUES (
    'bellad_and_company',
    'Bellad & Company Group Loyalty',
    '#0F172A',
    '#2563EB',
    'en-IN',
    '["en-IN", "kn-IN"]'::jsonb,
    'support@bellad.co',
    '+91-836-2350000'
) ON CONFLICT (tenant_id) DO NOTHING;

-- Also seed Trident and Advaith if present
INSERT INTO tenant_branding_configs (
    tenant_id,
    portal_title,
    primary_color,
    accent_color,
    i18n_default_language
) VALUES 
('trident_automobiles', 'Trident Automobiles Loyalty Program', '#1E293B', '#DC2626', 'en-IN'),
('advaith_motors', 'Advaith Motors Customer Rewards', '#0284C7', '#0EA5E9', 'en-IN')
ON CONFLICT (tenant_id) DO NOTHING;

-- 5. SEED BELLAD & COMPANY (TENANT #1) VERSION 1 AS THE OFFICIAL ZERO-REGRESSION BASELINE
INSERT INTO tenant_loyalty_rule_versions (
    tenant_id,
    version_number,
    status,
    ruleset_payload,
    checksum,
    published_by,
    published_at,
    approved_by,
    approved_at,
    release_notes,
    is_active
) VALUES (
    'bellad_and_company',
    1,
    'published',
    '{
      "version": 1,
      "tenant_id": "bellad_and_company",
      "currency": "INR",
      "redemption": {
        "conversion_rate": 0.25,
        "points_per_rupee": 4,
        "min_points_to_redeem": 100,
        "max_discount_percentage": 100,
        "lock_period_months": 12,
        "lock_exempt_categories": ["accessories", "accessory"],
        "expiry_period_months": 24,
        "reset_expiry_on_activity": true
      },
      "tiers": [
        {
          "tier_name": "Silver",
          "priority": 100,
          "eval_basis": "expense_paise",
          "min_metric_value": 0,
          "points_multiplier": 1.0,
          "perks": ["Standard counter benefits", "Access to referral rewards"]
        },
        {
          "tier_name": "Gold",
          "priority": 200,
          "eval_basis": "expense_paise",
          "min_metric_value": 5000000,
          "points_multiplier": 1.0,
          "perks": ["Priority workshop scheduling", "Free 15-point checkup"]
        },
        {
          "tier_name": "Platinum",
          "priority": 300,
          "eval_basis": "expense_paise",
          "min_metric_value": 20000000,
          "points_multiplier": 1.0,
          "perks": ["Complimentary vehicle wash on service", "Dedicated relationship manager"]
        }
      ],
      "rules": [
        {
          "rule_id": "bellad_sale_baseline",
          "rule_name": "Vehicle Sales Baseline (1% Net Ex-Showroom)",
          "priority_weight": 100,
          "event_type": "sale",
          "conditions": {
            "vehicle_types": ["ALL"],
            "brands": ["ALL"],
            "branches": ["ALL"],
            "customer_tiers": ["ALL"]
          },
          "action": {
            "discount": { "type": "none", "value": 0 },
            "points_earning": {
              "formula_basis": "net_ex_showroom",
              "multiplier_numerator": 1,
              "multiplier_denominator": 100,
              "bonus_points": 0
            }
          }
        },
        {
          "rule_id": "bellad_service_baseline",
          "rule_name": "Service Workshop Baseline (4% Invoice Amount)",
          "priority_weight": 100,
          "event_type": "service",
          "conditions": {
            "vehicle_types": ["ALL"],
            "brands": ["ALL"],
            "branches": ["ALL"],
            "customer_tiers": ["ALL"]
          },
          "action": {
            "discount": { "type": "none", "value": 0 },
            "points_earning": {
              "formula_basis": "bill_amount",
              "multiplier_numerator": 4,
              "multiplier_denominator": 100,
              "bonus_points": 0
            }
          }
        },
        {
          "rule_id": "bellad_accessories_baseline",
          "rule_name": "Showroom Accessories Baseline (2% Invoice Amount)",
          "priority_weight": 100,
          "event_type": "accessory",
          "conditions": {
            "vehicle_types": ["ALL"],
            "brands": ["ALL"],
            "branches": ["ALL"],
            "customer_tiers": ["ALL"]
          },
          "action": {
            "discount": { "type": "none", "value": 0 },
            "points_earning": {
              "formula_basis": "bill_amount",
              "multiplier_numerator": 2,
              "multiplier_denominator": 100,
              "bonus_points": 0
            }
          }
        },
        {
          "rule_id": "bellad_bodyshop_baseline",
          "rule_name": "Bodyshop & Accidental Repairs (3% Invoice Amount)",
          "priority_weight": 100,
          "event_type": "bodyshop",
          "conditions": {
            "vehicle_types": ["ALL"],
            "brands": ["ALL"],
            "branches": ["ALL"],
            "customer_tiers": ["ALL"]
          },
          "action": {
            "discount": { "type": "none", "value": 0 },
            "points_earning": {
              "formula_basis": "bill_amount",
              "multiplier_numerator": 3,
              "multiplier_denominator": 100,
              "bonus_points": 0
            }
          }
        },
        {
          "rule_id": "bellad_inhouse_finance",
          "rule_name": "In-House Dealership Auto Finance Bonus",
          "priority_weight": 200,
          "event_type": "bonus",
          "conditions": { "vehicle_types": ["ALL"], "brands": ["ALL"], "branches": ["ALL"] },
          "action": {
            "points_earning": { "multiplier_numerator": 0, "multiplier_denominator": 100, "bonus_points": 100 }
          }
        },
        {
          "rule_id": "bellad_inhouse_insurance",
          "rule_name": "In-House Dealership Motor Insurance Bonus",
          "priority_weight": 200,
          "event_type": "bonus",
          "conditions": { "vehicle_types": ["ALL"], "brands": ["ALL"], "branches": ["ALL"] },
          "action": {
            "points_earning": { "multiplier_numerator": 0, "multiplier_denominator": 100, "bonus_points": 50 }
          }
        },
        {
          "rule_id": "bellad_inhouse_exchange",
          "rule_name": "In-House Vehicle Trade-in Exchange Bonus",
          "priority_weight": 200,
          "event_type": "bonus",
          "conditions": { "vehicle_types": ["ALL"], "brands": ["ALL"], "branches": ["ALL"] },
          "action": {
            "points_earning": { "multiplier_numerator": 0, "multiplier_denominator": 100, "bonus_points": 200 }
          }
        },
        {
          "rule_id": "bellad_google_review_boost",
          "rule_name": "Verified 5-Star Google Review Boost",
          "priority_weight": 250,
          "event_type": "bonus",
          "conditions": { "vehicle_types": ["ALL"], "brands": ["ALL"], "branches": ["ALL"] },
          "action": {
            "points_earning": { "multiplier_numerator": 0, "multiplier_denominator": 100, "bonus_points": 250 }
          }
        }
      ]
    }'::jsonb,
    'sha256-baseline-bellad-v1',
    'System Initializer (Principal Architect)',
    NOW(),
    'Director (Executive)',
    NOW(),
    'Official production baseline migration replicating 100% of existing hardcoded rules.',
    true
) ON CONFLICT (tenant_id, version_number) DO UPDATE
SET ruleset_payload = EXCLUDED.ruleset_payload,
    is_active = true,
    updated_at = NOW();

-- 6. POSTGRESQL NOTIFY TRIGGER FOR REAL-TIME INVALIDATION
CREATE OR REPLACE FUNCTION notify_rule_published()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'published' AND NEW.is_active = true) THEN
        PERFORM pg_notify(
            'loyalty_rule_published',
            json_build_object(
                'tenant_id', NEW.tenant_id,
                'version_id', NEW.version_id,
                'version_number', NEW.version_number,
                'published_at', NEW.published_at
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_rule_published ON tenant_loyalty_rule_versions;
CREATE TRIGGER trg_notify_rule_published
AFTER INSERT OR UPDATE ON tenant_loyalty_rule_versions
FOR EACH ROW EXECUTE FUNCTION notify_rule_published();
