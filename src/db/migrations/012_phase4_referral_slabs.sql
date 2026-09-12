-- 012: Phase 4 Referral Slabs & Vehicle Category Migration
-- ------------------------------------------------------------
-- 1. Add vehicle_type to vehicles table with default '4W'
-- 2. Backfill vehicle_type based on brand/model
-- 3. Add suggested_points to referrals table
-- 4. Seed referral_slabs table with 4W and 2W slab sets

-- ─── 1. VEHICLES Table Update ───────────────────────────────────────────────

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(10) DEFAULT '4W';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
    ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check CHECK (vehicle_type IN ('2W', '4W'));
  END IF;
END
$$;

-- Backfill vehicle_type based on brand/model matching
UPDATE vehicles
SET vehicle_type = '2W'
WHERE (
  LOWER(COALESCE(model, '')) LIKE '%ather%' OR
  LOWER(COALESCE(model, '')) LIKE '%hero%' OR
  LOWER(COALESCE(model, '')) LIKE '%vida%' OR
  LOWER(COALESCE(model, '')) LIKE '%scooter%' OR
  LOWER(COALESCE(model, '')) LIKE '%bike%' OR
  LOWER(COALESCE(model, '')) LIKE '%2w%'
);

UPDATE vehicles
SET vehicle_type = '4W'
WHERE vehicle_type IS NULL OR vehicle_type NOT IN ('2W', '4W');


-- ─── 2. REFERRALS Table Update ──────────────────────────────────────────────

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS suggested_points BIGINT DEFAULT 0;


-- ─── 3. REFERRAL_SLABS Table Seed ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_slabs (
  id                SERIAL PRIMARY KEY,
  category          VARCHAR(10) NOT NULL CHECK (category IN ('4W', '2W')),
  price_range_label VARCHAR(100) NOT NULL,
  price_min_paise   BIGINT NOT NULL,
  price_max_paise   BIGINT,
  base_amount_paise BIGINT NOT NULL,
  points_awarded    BIGINT NOT NULL, -- (base_amount_paise / 100 / 4 precomputed)
  tenant_id         VARCHAR(64) NOT NULL DEFAULT 'BAC-MAIN',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_referral_slabs_tenant_cat_label UNIQUE (tenant_id, category, price_range_label)
);

-- Delete older partial seed data to replace with exact Phase 4 slab sets
DELETE FROM referral_slabs WHERE price_range_label IN (
  '5L - 10L', '10L - 15L', '15L - 20L', '20L - 25L', '25L+',
  '50k - 1L', '1L - 1.5L', '1.5L - 2L', '2L+'
);

INSERT INTO referral_slabs (category, price_range_label, price_min_paise, price_max_paise, base_amount_paise, points_awarded, tenant_id)
VALUES
  -- 4W Slabs (BAC-MAIN & bellad_and_company)
  ('4W', '5-10L',   50000000, 100000000, 1000000, 2500, 'BAC-MAIN'),
  ('4W', '10-15L', 100000000, 150000000, 1500000, 3750, 'BAC-MAIN'),
  ('4W', '15-20L', 150000000, 200000000, 2000000, 5000, 'BAC-MAIN'),
  ('4W', '20-25L', 200000000, 250000000, 2500000, 6250, 'BAC-MAIN'),
  ('4W', '25L+',      250000000, NULL,      3000000, 7500, 'BAC-MAIN'),

  ('4W', '5-10L',   50000000, 100000000, 1000000, 2500, 'bellad_and_company'),
  ('4W', '10-15L', 100000000, 150000000, 1500000, 3750, 'bellad_and_company'),
  ('4W', '15-20L', 150000000, 200000000, 2000000, 5000, 'bellad_and_company'),
  ('4W', '20-25L', 200000000, 250000000, 2500000, 6250, 'bellad_and_company'),
  ('4W', '25L+',      250000000, NULL,      3000000, 7500, 'bellad_and_company'),

  -- 2W Slabs (BAC-MAIN & bellad_and_company)
  ('2W', '50k-1L',    5000000,  10000000,   200000,  500, 'BAC-MAIN'),
  ('2W', '1-1.25L',  10000000,  12500000,   300000,  750, 'BAC-MAIN'),
  ('2W', '1.25-1.5L', 12500000, 15000000,   400000, 1000, 'BAC-MAIN'),
  ('2W', '1.5-1.75L', 15000000, 17500000,   500000, 1250, 'BAC-MAIN'),
  ('2W', '1.75-2L',  17500000,  20000000,   600000, 1500, 'BAC-MAIN'),
  ('2W', '2L+',       20000000,  NULL,       700000, 1750, 'BAC-MAIN'),

  ('2W', '50k-1L',    5000000,  10000000,   200000,  500, 'bellad_and_company'),
  ('2W', '1-1.25L',  10000000,  12500000,   300000,  750, 'bellad_and_company'),
  ('2W', '1.25-1.5L', 12500000, 15000000,   400000, 1000, 'bellad_and_company'),
  ('2W', '1.5-1.75L', 15000000, 17500000,   500000, 1250, 'bellad_and_company'),
  ('2W', '1.75-2L',  17500000,  20000000,   600000, 1500, 'bellad_and_company'),
  ('2W', '2L+',       20000000,  NULL,       700000, 1750, 'bellad_and_company')
ON CONFLICT (tenant_id, category, price_range_label) DO UPDATE
SET price_min_paise = EXCLUDED.price_min_paise,
    price_max_paise = EXCLUDED.price_max_paise,
    base_amount_paise = EXCLUDED.base_amount_paise,
    points_awarded = EXCLUDED.points_awarded;
