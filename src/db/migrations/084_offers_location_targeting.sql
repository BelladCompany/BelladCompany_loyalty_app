-- ============================================================================
-- Migration 084: Offers Location Targeting & GPS Geo-Fencing
-- Purpose: Enable location-based offers per city/region (e.g. Hubli 50%, Bangalore 80%)
-- ============================================================================

-- 1. Add location targeting columns to dealership_offers
ALTER TABLE dealership_offers 
  ADD COLUMN IF NOT EXISTS target_cities TEXT[] DEFAULT ARRAY['All Cities']::TEXT[],
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_statewide BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS geofence_lat NUMERIC(9,6) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS geofence_lng NUMERIC(9,6) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS radius_km NUMERIC(5,1) DEFAULT 50.0;

-- 2. Backfill target_cities from existing city text
UPDATE dealership_offers
SET 
  target_cities = CASE
    WHEN city IS NULL OR city ILIKE '%All Cities%' OR city ILIKE '%All Branches%' THEN ARRAY['All Cities']::TEXT[]
    ELSE string_to_array(REGEXP_REPLACE(city, '\s*,\s*', ',', 'g'), ',')
  END,
  is_statewide = CASE
    WHEN city IS NULL OR city ILIKE '%All Cities%' THEN true
    ELSE false
  END
WHERE target_cities IS NULL OR target_cities = ARRAY['All Cities']::TEXT[];

-- 3. GIN index for fast array membership lookup (e.g. 'Bangalore' = ANY(target_cities))
CREATE INDEX IF NOT EXISTS idx_dealership_offers_cities_gin 
  ON dealership_offers USING GIN (target_cities);
