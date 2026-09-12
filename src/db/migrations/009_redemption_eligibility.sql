-- 009: Redemption Eligibility Window & Expiry System
-- ------------------------------------------------------------
-- This migration implements the per-vehicle redemption lifecycle:
--   Locked    (0–12 months from purchase_date) — cannot redeem
--   Eligible  (12–24 months)                   — can redeem
--   Expired   (after 24 months)                — points forfeited
--
-- After any redemption the clock resets:
--   redemption_eligible_at = redemption_date + 12 months
--   redemption_expires_at  = redemption_date + 24 months
--
-- Each points_ledger batch has its own independent 24-month window
-- (stored via vehicle_id link + created_at on the row).
-- The cron job writes off expired batches as 'expire' ledger entries.

-- ─── 1. VEHICLES — Redemption lifecycle columns ──────────────────────────────

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS redemption_status        VARCHAR(20) NOT NULL DEFAULT 'locked'
    CHECK (redemption_status IN ('locked', 'eligible', 'expired')),
  ADD COLUMN IF NOT EXISTS redemption_eligible_at   TIMESTAMPTZ,  -- when the 12-month lock lifts
  ADD COLUMN IF NOT EXISTS redemption_expires_at    TIMESTAMPTZ,  -- when points forfeit (24 months)
  ADD COLUMN IF NOT EXISTS redemption_notified_3m   BOOLEAN NOT NULL DEFAULT FALSE, -- 3-month reminder sent
  ADD COLUMN IF NOT EXISTS redemption_notified_1m   BOOLEAN NOT NULL DEFAULT FALSE; -- 1-month reminder sent

-- Back-fill redemption_eligible_at and redemption_expires_at for existing vehicles
-- that already have a purchase_date set. Status will be recomputed by the first cron run.
UPDATE vehicles
SET
  redemption_eligible_at = (purchase_date + INTERVAL '12 months')::TIMESTAMPTZ,
  redemption_expires_at  = (purchase_date + INTERVAL '24 months')::TIMESTAMPTZ
WHERE purchase_date IS NOT NULL
  AND redemption_eligible_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_redemption_status ON vehicles (tenant_id, redemption_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_redemption_expires ON vehicles (redemption_expires_at)
  WHERE redemption_status != 'expired';

-- ─── 2. POINTS_LEDGER — Add vehicle_id FK ────────────────────────────────────

ALTER TABLE points_ledger
  ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL;

-- Extend the type CHECK constraint to allow 'expire' (forfeiture write-off entries)
-- First drop the old constraint, then re-create with the new value included.
ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_transaction_type_check;
ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_type_check;

-- Re-add with 'expire' included. Column name in live schema is 'type' (not 'transaction_type').
-- We do not know the exact constraint name, so we handle both:
DO $$
BEGIN
  -- Re-add CHECK on 'type' column (live schema column name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'points_ledger' AND column_name = 'type'
  ) THEN
    ALTER TABLE points_ledger
      ADD CONSTRAINT points_ledger_type_check
      CHECK (type IN ('earn_sale', 'earn_service', 'earn_referral', 'redeem', 'adjust', 'expire'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_points_ledger_vehicle ON points_ledger (vehicle_id, created_at)
  WHERE vehicle_id IS NOT NULL;

-- ─── 3. REDEMPTIONS — Add vehicle_id FK ──────────────────────────────────────

ALTER TABLE redemptions
  ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_redemptions_vehicle ON redemptions (vehicle_id)
  WHERE vehicle_id IS NOT NULL;
