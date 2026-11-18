-- Migration 073: Disable Points Expiry & Repair Historical Purchase Dates
-- In Bellad & Co Loyalty Rewards, points NEVER expire.
-- Vehicles purchased > 12 months ago are immediately eligible for redemption.

-- 1. Remove points expiration column constraints & clear expired points
UPDATE vehicles SET redemption_expires_at = NULL;
UPDATE vehicles SET redemption_status = 'eligible' WHERE redemption_status = 'expired';

-- 2. Clear any forfeiture entries in points_ledger (points never expire)
DELETE FROM points_ledger WHERE type = 'expire';

-- 3. Update vehicles with purchase_date > 12 months ago to 'eligible'
UPDATE vehicles
SET redemption_status = 'eligible',
    updated_at = NOW()
WHERE redemption_status = 'locked'
  AND redemption_eligible_at IS NOT NULL
  AND redemption_eligible_at <= NOW();
