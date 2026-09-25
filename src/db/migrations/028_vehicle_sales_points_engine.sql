-- 028_vehicle_sales_points_engine.sql
-- Vehicle Sales Points Calculation Engine Schema Extensions

-- 1. Extend points_ledger with source_ref, reason_type, and reason_text for structured breakdown and corrections
ALTER TABLE points_ledger
  ADD COLUMN IF NOT EXISTS source_ref VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reason_type VARCHAR(50) DEFAULT 'purchase',
  ADD COLUMN IF NOT EXISTS reason_text TEXT;

-- Backfill source_ref from reference_id if reference_id exists and source_ref is NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points_ledger' AND column_name = 'reference_id') THEN
    UPDATE points_ledger SET source_ref = reference_id WHERE source_ref IS NULL AND reference_id IS NOT NULL;
  END IF;
END $$;

-- Expand points_ledger_type_check constraint if present to allow 'adjust' and 'adjustment'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'points_ledger_type_check') THEN
    ALTER TABLE points_ledger DROP CONSTRAINT points_ledger_type_check;
    ALTER TABLE points_ledger ADD CONSTRAINT points_ledger_type_check
      CHECK (type IN ('earn', 'earn_sale', 'earn_service', 'earn_accessory', 'earn_bodyshop', 'earn_referral', 'redeem', 'adjust', 'adjustment', 'expire', 'sale', 'service', 'referral', 'correction_reversal', 'correction_applied'));
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_points_ledger_reason_type ON points_ledger (tenant_id, reason_type);
CREATE INDEX IF NOT EXISTS idx_points_ledger_source_ref ON points_ledger (tenant_id, source_ref);

-- 2. Extend sale_transactions with raw discount fields and invoice finalization tracking
ALTER TABLE sale_transactions
  ADD COLUMN IF NOT EXISTS tcs_amount_paise BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dealer_cash_discount_paise BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emps_discount_paise BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oem_offers_amount_paise BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage VARCHAR(32) DEFAULT 'finalized',
  ADD COLUMN IF NOT EXISTS is_invoice_finalized BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS points_calculated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sale_transactions_finalized ON sale_transactions (tenant_id, is_invoice_finalized, points_calculated);

-- 3. Generic Discounts Sub-table per Sale Transaction
CREATE TABLE IF NOT EXISTS sale_transaction_discounts (
  id                  SERIAL PRIMARY KEY,
  sale_transaction_id INTEGER REFERENCES sale_transactions(id) ON DELETE CASCADE,
  reference_id        VARCHAR(100) NOT NULL,
  discount_type       VARCHAR(100) NOT NULL,
  discount_name       VARCHAR(100) NOT NULL,
  amount_paise        BIGINT NOT NULL DEFAULT 0,
  tenant_id           VARCHAR(64) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_transaction_discounts_ref ON sale_transaction_discounts (tenant_id, reference_id);
CREATE INDEX IF NOT EXISTS idx_sale_transaction_discounts_sale_id ON sale_transaction_discounts (sale_transaction_id);
