-- 010: Phase 1 Foundation Migration
-- ------------------------------------------------------------
-- 1. CITEXT Extension & Case-Insensitive Uniqueness
-- 2. Service Transactions Table & Unique Job Card Constraint
-- 3. Points Ledger Transaction Category Field & Backfill
-- 4. Nominees Table
-- 5. KYC Change Requests Table
-- 6. Referral Slabs Table & Initial Seed Data
-- 7. Public Balance Tokens Table

-- ─── 1. CITEXT Extension & Case-Insensitive Columns ──────────────────────────

CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_phones' AND column_name = 'phone_number') THEN
    ALTER TABLE customer_phones ALTER COLUMN phone_number TYPE CITEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'chassis_no') THEN
    ALTER TABLE vehicles ALTER COLUMN chassis_no TYPE CITEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'registration_number') THEN
    ALTER TABLE vehicles ALTER COLUMN registration_number TYPE CITEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE users ALTER COLUMN username TYPE CITEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'email') THEN
    ALTER TABLE customers ALTER COLUMN email TYPE CITEXT;
  END IF;
END
$$;


-- ─── 2. SERVICE_TRANSACTIONS Table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_transactions (
  id                  SERIAL PRIMARY KEY,
  customer_id         VARCHAR(32) REFERENCES customers(customer_id) ON DELETE SET NULL,
  vehicle_id          INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
  branch_id           INTEGER REFERENCES branches(branch_id) ON DELETE SET NULL,
  job_card_number     VARCHAR(64) NOT NULL,
  bill_amount_paise   BIGINT NOT NULL DEFAULT 0,
  category            VARCHAR(32) NOT NULL DEFAULT 'service' CHECK (category IN ('service', 'accessory', 'bodyshop')),
  source              VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('auto_dms', 'manual')),
  reference_id        VARCHAR(100),
  created_by          INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  tenant_id           VARCHAR(64) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_service_transactions_tenant_branch_job_card UNIQUE (tenant_id, branch_id, job_card_number)
);

CREATE INDEX IF NOT EXISTS idx_service_transactions_tenant_branch ON service_transactions (tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_service_transactions_customer ON service_transactions (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_service_transactions_job_card ON service_transactions (tenant_id, job_card_number);


-- ─── 3. POINTS_LEDGER — Transaction Category ────────────────────────────────

ALTER TABLE points_ledger
  ADD COLUMN IF NOT EXISTS transaction_category VARCHAR(32);

-- Temporarily disable modification trigger for points_ledger if present to allow column backfill
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification'
  ) THEN
    ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;
  END IF;
END
$$;

-- Backfill transaction_category ('service' / 'sale') from existing type / transaction_type column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'points_ledger' AND column_name = 'type'
  ) THEN
    UPDATE points_ledger
    SET transaction_category = CASE
      WHEN type::text LIKE '%service%' THEN 'service'
      WHEN type::text LIKE '%sale%' THEN 'sale'
      ELSE 'sale'
    END
    WHERE transaction_category IS NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'points_ledger' AND column_name = 'transaction_type'
  ) THEN
    UPDATE points_ledger
    SET transaction_category = CASE
      WHEN transaction_type::text LIKE '%service%' THEN 'service'
      WHEN transaction_type::text LIKE '%sale%' THEN 'sale'
      ELSE 'sale'
    END
    WHERE transaction_category IS NULL;
  ELSE
    UPDATE points_ledger
    SET transaction_category = 'sale'
    WHERE transaction_category IS NULL;
  END IF;
END
$$;

-- Re-enable modification trigger for points_ledger if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification'
  ) THEN
    ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
  END IF;
END
$$;

-- Make transaction_category NOT NULL and add CHECK constraint
ALTER TABLE points_ledger
  ALTER COLUMN transaction_category SET NOT NULL;

ALTER TABLE points_ledger
  DROP CONSTRAINT IF EXISTS points_ledger_transaction_category_check;

ALTER TABLE points_ledger
  ADD CONSTRAINT points_ledger_transaction_category_check
    CHECK (transaction_category IN ('service', 'sale', 'accessory', 'bodyshop', 'referral', 'redemption', 'expiry', 'adjust'));

CREATE INDEX IF NOT EXISTS idx_points_ledger_category ON points_ledger (tenant_id, transaction_category);


-- ─── 4. NOMINEES Table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nominees (
  id              SERIAL PRIMARY KEY,
  customer_id     VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  nominee_name    VARCHAR(255) NOT NULL,
  nominee_phone   CITEXT,
  relation        VARCHAR(100),
  id_proof_type   VARCHAR(50),
  id_proof_ref    VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id       VARCHAR(64) NOT NULL,
  created_by      INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nominees_customer ON nominees (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_nominees_tenant ON nominees (tenant_id);


-- ─── 5. KYC_CHANGE_REQUESTS Table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kyc_change_requests (
  id                SERIAL PRIMARY KEY,
  customer_id       VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  change_type       VARCHAR(50) NOT NULL DEFAULT 'phone_update' CHECK (change_type IN ('phone_update')),
  old_value         VARCHAR(255),
  new_value         VARCHAR(255),
  reason            TEXT NOT NULL,
  id_proof_type     VARCHAR(50),
  id_proof_file_url TEXT,
  requested_by      INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  review_notes      TEXT,
  tenant_id         VARCHAR(64) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_change_requests_tenant_status ON kyc_change_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_kyc_change_requests_customer ON kyc_change_requests (tenant_id, customer_id);


-- ─── 6. REFERRAL_SLABS Table & Seed Data ───────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_referral_slabs_tenant_cat ON referral_slabs (tenant_id, category);

-- Seed initial referral slabs for 4W and 2W categories
INSERT INTO referral_slabs (category, price_range_label, price_min_paise, price_max_paise, base_amount_paise, points_awarded, tenant_id)
VALUES
  -- 4W Slabs
  ('4W', '5L - 10L',   50000000, 100000000, 1000000, 2500, 'BAC-MAIN'),
  ('4W', '10L - 15L', 100000000, 150000000, 1500000, 3750, 'BAC-MAIN'),
  ('4W', '15L - 20L', 150000000, 200000000, 2000000, 5000, 'BAC-MAIN'),
  ('4W', '20L - 25L', 200000000, 250000000, 2500000, 6250, 'BAC-MAIN'),
  ('4W', '25L+',      250000000, NULL,      3000000, 7500, 'BAC-MAIN'),
  -- 2W Slabs
  ('2W', '50k - 1L',   5000000,  10000000,   200000,  500, 'BAC-MAIN'),
  ('2W', '1L - 1.5L', 10000000,  15000000,   350000,  875, 'BAC-MAIN'),
  ('2W', '1.5L - 2L', 15000000,  20000000,   500000, 1250, 'BAC-MAIN'),
  ('2W', '2L+',       20000000,  NULL,       700000, 1750, 'BAC-MAIN')
ON CONFLICT (tenant_id, category, price_range_label) DO NOTHING;


-- ─── 7. PUBLIC_BALANCE_TOKENS Table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public_balance_tokens (
  id              SERIAL PRIMARY KEY,
  customer_id     VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  token           VARCHAR(64) NOT NULL UNIQUE,
  tenant_id       VARCHAR(64) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at  TIMESTAMPTZ,
  view_count      INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_balance_tokens_token ON public_balance_tokens (token);
CREATE INDEX IF NOT EXISTS idx_public_balance_tokens_customer ON public_balance_tokens (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_public_balance_tokens_expires ON public_balance_tokens (expires_at);
