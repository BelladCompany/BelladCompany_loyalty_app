-- Migration: 083_set_all_redemption_caps_to_50.sql
-- Purpose: Enforce 50% points redemption cap across all vehicle models and brands.
--          Customers can redeem up to 50% of their available points (e.g., 50 points out of 100).

UPDATE model_redemption_caps
SET redemption_cap_percent = 50.00,
    description = REGEXP_REPLACE(description, '100%|60%|75%', '50%'),
    updated_at = NOW(),
    updated_by = 'Director';

-- Ensure Global Default is 50%
INSERT INTO model_redemption_caps (
  tenant_id, brand_name, model_name, redemption_cap_percent, description, updated_by, is_active, updated_at
)
VALUES ('bellad_and_company', 'ALL', 'ALL', 50.00, 'Global Default: Up to 50% points redemption cap', 'Director', true, NOW())
ON CONFLICT (tenant_id, brand_name, model_name) DO UPDATE SET
  redemption_cap_percent = 50.00,
  updated_at = NOW();
