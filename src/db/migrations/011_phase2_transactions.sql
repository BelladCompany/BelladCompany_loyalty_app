-- 011: Phase 2 Transactions Migration
-- ------------------------------------------------------------
-- 1. Ensure service_transactions has all Phase 2 fields
-- 2. Create sale_transactions table
-- 3. Extend point_rules CHECK constraint & seed table for all 4 categories (sale, service, accessory, bodyshop)

-- ─── 1. SERVICE_TRANSACTIONS Table Update ───────────────────────────────────

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
  CONSTRAINT uq_service_transactions_job_card UNIQUE (tenant_id, branch_id, job_card_number)
);

ALTER TABLE service_transactions
  ADD COLUMN IF NOT EXISTS category VARCHAR(32) NOT NULL DEFAULT 'service' CHECK (category IN ('service', 'accessory', 'bodyshop')),
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('auto_dms', 'manual')),
  ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_service_transactions_tenant_branch ON service_transactions (tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_service_transactions_customer ON service_transactions (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_service_transactions_job_card ON service_transactions (tenant_id, job_card_number);


-- ─── 2. SALE_TRANSACTIONS Table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sale_transactions (
  id                      SERIAL PRIMARY KEY,
  customer_id             VARCHAR(32) REFERENCES customers(customer_id) ON DELETE SET NULL,
  vehicle_id              INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
  branch_id               INTEGER REFERENCES branches(branch_id) ON DELETE SET NULL,
  ex_showroom_price_paise BIGINT NOT NULL DEFAULT 0,
  source                  VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('auto_dms', 'manual')),
  reference_id            VARCHAR(100) NOT NULL,
  created_by              INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  tenant_id               VARCHAR(64) NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sale_transactions_reference UNIQUE (tenant_id, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_sale_transactions_tenant_ref ON sale_transactions (tenant_id, reference_id);
CREATE INDEX IF NOT EXISTS idx_sale_transactions_customer ON sale_transactions (tenant_id, customer_id);


-- ─── 3. EXTEND POINT_RULES CONSTRAINT & SEED FOR ALL CATEGORIES ──────────────

ALTER TABLE point_rules DROP CONSTRAINT IF EXISTS point_rules_rate_type_check;
ALTER TABLE point_rules DROP CONSTRAINT IF EXISTS point_rules_rule_type_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'point_rules' AND column_name = 'rate_type'
  ) THEN
    ALTER TABLE point_rules ADD CONSTRAINT point_rules_rate_type_check CHECK (rate_type IN ('sale', 'service', 'accessory', 'bodyshop'));
    
    INSERT INTO point_rules (rate_type, points_per_100, tenant_id)
    VALUES
      ('sale', 1.00, 'BAC-MAIN'),
      ('service', 4.00, 'BAC-MAIN'),
      ('accessory', 2.00, 'BAC-MAIN'),
      ('bodyshop', 3.00, 'BAC-MAIN'),
      ('sale', 1.00, 'bellad_and_company'),
      ('service', 4.00, 'bellad_and_company'),
      ('accessory', 2.00, 'bellad_and_company'),
      ('bodyshop', 3.00, 'bellad_and_company')
    ON CONFLICT DO NOTHING;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'point_rules' AND column_name = 'rule_type'
  ) THEN
    ALTER TABLE point_rules ADD CONSTRAINT point_rules_rule_type_check CHECK (rule_type IN ('sale', 'service', 'accessory', 'bodyshop'));

    INSERT INTO point_rules (rule_type, multiplier_numerator, multiplier_denominator, tenant_id)
    VALUES
      ('sale', 1, 100, 'BAC-MAIN'),
      ('service', 4, 100, 'BAC-MAIN'),
      ('accessory', 2, 100, 'BAC-MAIN'),
      ('bodyshop', 3, 100, 'BAC-MAIN')
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;
