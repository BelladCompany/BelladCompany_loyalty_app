-- Migration: 076_campaign_addon_engine.sql
-- Description: Additive Campaign Add-on Engine schema without modifying standard policy tables
-- Reversible: Yes (DROP TABLE / DROP COLUMN statements provided in rollback)

-- 1. Campaigns Master Table
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'PCT_OF_STANDARD' | 'FLAT_POINTS' | 'EXTRA_PER_100'
  value NUMERIC(12, 2) NOT NULL,
  max_bonus_per_invoice NUMERIC(12, 2) NULL,
  vehicle_type VARCHAR(50) DEFAULT 'ALL' NOT NULL, -- '2W' | '4W' | 'ALL'
  spend_category VARCHAR(50) DEFAULT 'sale' NOT NULL, -- 'sale', 'service', 'bodyshop', 'accessories', 'spares', 'gift_cards', 'ALL'
  brand VARCHAR(100) DEFAULT 'ALL' NOT NULL,
  all_models BOOLEAN DEFAULT false NOT NULL,
  all_branches BOOLEAN DEFAULT false NOT NULL,
  customer_tier VARCHAR(50) DEFAULT 'ALL' NOT NULL, -- 'ALL' | 'silver' | 'gold' | 'platinum'
  min_spend NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  max_spend NUMERIC(12, 2) NULL, -- NULL = unlimited
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  date_basis VARCHAR(50) DEFAULT 'INVOICE' NOT NULL, -- 'INVOICE' | 'BOOKING' | 'DELIVERY'
  stacking VARCHAR(50) DEFAULT 'STACK' NOT NULL, -- 'STACK' | 'HIGHEST_ONLY'
  priority INT DEFAULT 100 NOT NULL, -- Lower number = higher priority
  redeem_lock_days INT NULL, -- NULL = same as standard policy (365 days)
  status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL, -- 'DRAFT' | 'ACTIVE' | 'CANCELLED'
  notes TEXT NULL,
  created_by VARCHAR(100) NULL,
  activated_by VARCHAR(100) NULL,
  tenant_id VARCHAR(100) DEFAULT 'bellad_and_company' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_campaign_type CHECK (type IN ('PCT_OF_STANDARD', 'FLAT_POINTS', 'EXTRA_PER_100')),
  CONSTRAINT chk_campaign_status CHECK (status IN ('DRAFT', 'ACTIVE', 'CANCELLED')),
  CONSTRAINT chk_campaign_stacking CHECK (stacking IN ('STACK', 'HIGHEST_ONLY')),
  CONSTRAINT chk_campaign_date_basis CHECK (date_basis IN ('INVOICE', 'BOOKING', 'DELIVERY'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_lookup 
ON campaigns (tenant_id, status, start_date, end_date);

-- 2. Campaign Model Association Table
CREATE TABLE IF NOT EXISTS campaign_models (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  model_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) DEFAULT 'bellad_and_company' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (campaign_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_models_lookup 
ON campaign_models (tenant_id, model_id);

-- 3. Campaign Branch Association Table
CREATE TABLE IF NOT EXISTS campaign_branches (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  branch_id INT NOT NULL,
  tenant_id VARCHAR(100) DEFAULT 'bellad_and_company' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (campaign_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_branches_lookup 
ON campaign_branches (tenant_id, branch_id);

-- 4. Campaign Audit Log Table
CREATE TABLE IF NOT EXISTS campaign_audit_log (
  id SERIAL PRIMARY KEY,
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'CREATE' | 'EDIT' | 'ACTIVATE' | 'CANCEL' | 'DUPLICATE'
  changed_by VARCHAR(100) NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_audit_log_cid 
ON campaign_audit_log (campaign_id, at DESC);

-- 5. Additive Nullable Columns to existing points_ledger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN source_type VARCHAR(50) DEFAULT 'STANDARD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN campaign_id INT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'parent_entry_id'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN parent_entry_id INT NULL;
  END IF;
END $$;

-- 6. Unique Idempotency Constraint for Campaign Bonus Points
-- Ensures the same invoice (source_ref) can never be credited twice for the same campaign bonus
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_campaign_idempotent
ON points_ledger (tenant_id, source_ref, campaign_id)
WHERE (source_type = 'CAMPAIGN' AND campaign_id IS NOT NULL AND points > 0);
