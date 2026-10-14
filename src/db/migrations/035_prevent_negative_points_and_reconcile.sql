-- Migration 035: Prevent Negative Points Balance and Reconcile Historical Overdrafts

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
