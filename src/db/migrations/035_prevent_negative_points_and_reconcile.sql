-- Migration 035: Prevent Negative Points Balance and Reconcile Historical Overdrafts

-- 0. Ensure schema compatibility across points_ledger, customer_tier_snapshot, and tier_rules
DO $$
BEGIN
  -- 0a. Add type column to points_ledger if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'type'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN type VARCHAR(32);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'points_ledger' AND column_name = 'transaction_type'
    ) THEN
      UPDATE points_ledger SET type = transaction_type WHERE type IS NULL;
    END IF;
  END IF;

  -- 0b. Drop NOT NULL on transaction_type if it exists, so inserting with only 'type' succeeds
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'transaction_type' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE points_ledger ALTER COLUMN transaction_type DROP NOT NULL;
  END IF;

  -- 0c. Ensure points_ledger constraints permit 'adjust'
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'points_ledger' AND constraint_name = 'points_ledger_transaction_type_check'
  ) THEN
    ALTER TABLE points_ledger DROP CONSTRAINT points_ledger_transaction_type_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'points_ledger' AND constraint_name = 'points_ledger_type_check'
  ) THEN
    ALTER TABLE points_ledger DROP CONSTRAINT points_ledger_type_check;
  END IF;

  -- 0d. Ensure customer_tier_snapshot has current_tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_tier_snapshot' AND column_name = 'current_tier'
  ) THEN
    ALTER TABLE customer_tier_snapshot ADD COLUMN current_tier VARCHAR(50);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'customer_tier_snapshot' AND column_name = 'tier_name'
    ) THEN
      UPDATE customer_tier_snapshot SET current_tier = tier_name WHERE current_tier IS NULL;
    END IF;
  END IF;

  -- 0e. Ensure tier_rules has min_lifetime_points
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_rules' AND column_name = 'min_lifetime_points'
  ) THEN
    ALTER TABLE tier_rules ADD COLUMN min_lifetime_points BIGINT DEFAULT 0;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tier_rules' AND column_name = 'min_points'
    ) THEN
      UPDATE tier_rules SET min_lifetime_points = min_points WHERE min_lifetime_points IS NULL OR min_lifetime_points = 0;
    END IF;
  END IF;

  -- 0f. Ensure tier_rules has min_vehicles and benefits_json for subsequent migrations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_rules' AND column_name = 'min_vehicles'
  ) THEN
    ALTER TABLE tier_rules ADD COLUMN min_vehicles INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_rules' AND column_name = 'benefits_json'
  ) THEN
    ALTER TABLE tier_rules ADD COLUMN benefits_json JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 1. Reconcile all customers currently with a negative points balance
INSERT INTO points_ledger (
  customer_id,
  tenant_id,
  branch_id,
  type,
  transaction_category,
  points,
  source_ref,
  reason_type,
  reason_text,
  redemption_rate_snapshot,
  created_at
)
SELECT
  pl.customer_id,
  pl.tenant_id,
  COALESCE(MAX(pl.branch_id), 1),
  'adjust',
  'adjust',
  ABS(SUM(pl.points)),
  'ADJ-NEGATIVE-BALANCE-FIX',
  'manual_adjustment',
  'System balance reconciliation: offset negative balance to restore non-negative zero baseline',
  0.2500,
  NOW()
FROM points_ledger pl
GROUP BY pl.customer_id, pl.tenant_id
HAVING SUM(pl.points) < 0;

-- 2. Refresh customer_tier_snapshot for all reconciled customers
INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, tenant_id, updated_at)
SELECT
  pl.customer_id,
  COALESCE(
    (SELECT tr.tier_name FROM tier_rules tr 
     WHERE tr.tenant_id = pl.tenant_id 
       AND tr.min_lifetime_points <= COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0)
     ORDER BY tr.min_lifetime_points DESC LIMIT 1),
    'Silver'
  ) AS current_tier,
  COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) AS lifetime_points,
  pl.tenant_id,
  NOW()
FROM points_ledger pl
WHERE pl.customer_id IN (
  SELECT customer_id FROM points_ledger WHERE source_ref = 'ADJ-NEGATIVE-BALANCE-FIX'
)
GROUP BY pl.customer_id, pl.tenant_id
ON CONFLICT (customer_id) DO UPDATE
  SET current_tier = EXCLUDED.current_tier,
      lifetime_points = EXCLUDED.lifetime_points,
      updated_at = NOW();

-- 3. Database-level trigger to guarantee cumulative points balance is never negative
CREATE OR REPLACE FUNCTION prevent_negative_points_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  -- Compute customer balance including the newly inserted row
  SELECT COALESCE(SUM(points), 0)
  INTO v_balance
  FROM points_ledger
  WHERE customer_id = NEW.customer_id AND tenant_id = NEW.tenant_id;

  IF v_balance < 0 THEN
    RAISE EXCEPTION 'Customer points balance cannot be negative. Resulting balance would be % pts for customer %', v_balance, NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_negative_points_balance ON points_ledger;
CREATE TRIGGER trg_prevent_negative_points_balance
AFTER INSERT ON points_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_negative_points_balance();
