-- 1. ADD MERGE TRACKING COLUMNS TO CUSTOMERS (Never delete rule)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_merged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS merged_into_customer_id VARCHAR(32) REFERENCES customers(customer_id);

CREATE INDEX IF NOT EXISTS idx_customers_is_merged ON customers (tenant_id, is_merged);

-- 2. CUSTOMER_MERGE_LOG
-- Permanent audit log for all customer merge operations (who approved it, when, why)
CREATE TABLE IF NOT EXISTS customer_merge_log (
  id SERIAL PRIMARY KEY,
  surviving_customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  merged_customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  transferred_points BIGINT NOT NULL DEFAULT 0,
  transferred_phones INTEGER NOT NULL DEFAULT 0,
  transferred_vehicles INTEGER NOT NULL DEFAULT 0,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_merge_log' AND column_name = 'surviving_customer_id') THEN
    CREATE INDEX IF NOT EXISTS idx_customer_merge_log_surviving ON customer_merge_log (tenant_id, surviving_customer_id);
    CREATE INDEX IF NOT EXISTS idx_customer_merge_log_merged ON customer_merge_log (tenant_id, merged_customer_id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_merge_log' AND column_name = 'merged_into_id') THEN
    CREATE INDEX IF NOT EXISTS idx_customer_merge_log_surviving ON customer_merge_log (tenant_id, merged_into_id);
    CREATE INDEX IF NOT EXISTS idx_customer_merge_log_merged ON customer_merge_log (tenant_id, merged_from_id);
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS idx_customer_merge_log_created ON customer_merge_log (created_at DESC);

-- 3. UPDATE points_ledger TRIGGER TO ALLOW MERGE REASSOCIATION
CREATE OR REPLACE FUNCTION prevent_points_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow reassignment during authorized customer merge transactions
  IF current_setting('loyalty.allow_merge', true) = 'on' THEN
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'points_ledger is strictly append-only. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;
