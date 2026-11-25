-- Migration: 078_model_redemption_caps.sql
-- Role: Principal Architect / Senior Full-Stack Engineer
-- Purpose: Dynamic per-vehicle-model redemption percentage caps and rules.
--          Enables director/admin to configure dynamic percentage caps (e.g. 50% for Tata/Hyundai, 100% for Hero)
--          with dynamic scroll-bar / slider configuration, persisted in PostgreSQL and enforced across POS cashier counter.

CREATE TABLE IF NOT EXISTS model_redemption_caps (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
    brand_name VARCHAR(100) NOT NULL DEFAULT 'ALL',
    model_name VARCHAR(100) NOT NULL DEFAULT 'ALL',
    redemption_cap_percent NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (redemption_cap_percent >= 0 AND redemption_cap_percent <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_by VARCHAR(100) DEFAULT 'Director',
    updated_by VARCHAR(100) DEFAULT 'Director',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_model_redemption_caps_tenant_brand_model UNIQUE (tenant_id, brand_name, model_name)
);

CREATE INDEX IF NOT EXISTS idx_model_redemption_caps_lookup 
ON model_redemption_caps (tenant_id, brand_name, model_name, is_active);

-- Seed initial rules matching user scenario and dealership fleet:
-- Tata models: 50% redemption cap
-- Hyundai models: 50% redemption cap
-- Hero models: 100% redemption cap (fully redeemable)
-- MG / Ather / Swaraj: default/custom caps
INSERT INTO model_redemption_caps (tenant_id, brand_name, model_name, redemption_cap_percent, description, updated_by)
VALUES
  ('bellad_and_company', 'HYUNDAI', 'ALL', 50.00, 'Hyundai models: Customers can redeem points up to 50% cap', 'Director'),
  ('bellad_and_company', 'HYUNDAI', 'New Creta', 50.00, 'Hyundai New Creta: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'HYUNDAI', 'Creta', 50.00, 'Hyundai Creta: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'HYUNDAI', 'Venue', 50.00, 'Hyundai Venue: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'HYUNDAI', 'EXTER', 50.00, 'Hyundai Exter: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'TATA MOTORS', 'ALL', 50.00, 'Tata Motors fleet: Customers can redeem points up to 50% cap', 'Director'),
  ('bellad_and_company', 'TATA MOTORS', 'NEXON', 50.00, 'Tata Nexon: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'TATA MOTORS', 'PUNCH', 50.00, 'Tata Punch: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'TATA MOTORS', 'HARRIER', 50.00, 'Tata Harrier: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'TATA MOTORS', 'SAFARI', 50.00, 'Tata Safari: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'TATA MOTORS', 'TIAGO', 50.00, 'Tata Tiago: 50% points redemption cap', 'Director'),
  ('bellad_and_company', 'HERO MOTO CORP', 'ALL', 100.00, 'Hero 2W customers: Can redeem points fully up to 100%', 'Director'),
  ('bellad_and_company', 'HERO MOTO CORP', 'SPLENDOR+', 100.00, 'Hero Splendor Plus: 100% full redemption', 'Director'),
  ('bellad_and_company', 'HERO MOTO CORP', 'HF DELUXE', 100.00, 'Hero HF Deluxe: 100% full redemption', 'Director'),
  ('bellad_and_company', 'HERO MOTO CORP', 'PASSION+', 100.00, 'Hero Passion Plus: 100% full redemption', 'Director'),
  ('bellad_and_company', 'MG MOTORS', 'ALL', 75.00, 'MG Motors: Customers can redeem points up to 75%', 'Director'),
  ('bellad_and_company', 'MG MOTORS', 'WINDSOR EV', 75.00, 'MG Windsor EV: 75% redemption cap', 'Director'),
  ('bellad_and_company', 'ATHER ENERGY', 'ALL', 100.00, 'Ather Energy EV: 100% full redemption', 'Director'),
  ('bellad_and_company', 'SWARAJ', 'ALL', 60.00, 'Swaraj Agri equipment: 60% redemption cap', 'Director'),
  ('bellad_and_company', 'ALL', 'ALL', 100.00, 'Global Default: Up to 100% points redemption when no specific model cap is configured', 'System')
ON CONFLICT (tenant_id, brand_name, model_name) DO UPDATE SET
    redemption_cap_percent = EXCLUDED.redemption_cap_percent,
    description = EXCLUDED.description,
    updated_at = NOW();
