-- Migration: 082_set_all_redemption_caps_to_100.sql
-- Purpose: Set 100% redemption allowance across all vehicle models and brands.
--          Removes restrictive 50% cap on Hyundai, Tata, and other models.

UPDATE model_redemption_caps
SET redemption_cap_percent = 100.00,
    description = REGEXP_REPLACE(description, '50%|60%|75%', '100%'),
    updated_at = NOW(),
    updated_by = 'Admin';
