-- 048_enforce_april_2026_loyalty_start_date.sql
-- Enforce Bellad Loyalty Program Inception Policy:
-- Only vehicles purchased on or after April 1, 2026 (FY26-27) earn loyalty rewards and enroll in loyalty.
-- Vehicles purchased before April 1, 2026 receive no vehicle sales loyalty points.

-- 1. Temporarily disable append-only trigger for administrative policy realignment
ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;

-- 2. Remove all earn_sale ledger entries tied to vehicles purchased before April 1, 2026
DELETE FROM points_ledger
WHERE type = 'earn_sale'
  AND vehicle_id IN (
    SELECT vehicle_id 
    FROM vehicles 
    WHERE purchase_date IS NOT NULL 
      AND purchase_date < '2026-04-01'
  );

-- 3. Also remove legacy sample/seed vehicle sales entries from pre-2026 test years
DELETE FROM points_ledger
WHERE type = 'earn_sale'
  AND vehicle_id IS NULL
  AND (
    source_ref ~* 'INV-202[0-5]' OR
    reason_text ~* 'INV-202[0-5]'
  );

-- 4. Re-enable append-only trigger immediately
ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;

-- 5. Update sale_transactions table to mark pre-April 2026 purchases as pre_program_launch
UPDATE sale_transactions st
SET points_calculated = FALSE,
    stage = 'pre_program_launch'
FROM vehicles v
WHERE st.vehicle_id = v.vehicle_id
  AND v.purchase_date IS NOT NULL
  AND v.purchase_date < '2026-04-01';

-- 6. Reconcile any customer who now has a negative balance due to previous redemptions
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
  'ADJ-PRE-APRIL-2026-BASELINE',
  'manual_adjustment',
  'System baseline adjustment: Reconcile pre-April 2026 vehicle purchase points to non-negative zero baseline',
  0.2500,
  NOW()
FROM points_ledger pl
GROUP BY pl.customer_id, pl.tenant_id
HAVING SUM(pl.points) < 0;

-- 7. Recalculate customer_tier_snapshot for all customers so lifetime_points and current_tier accurately reflect valid program points
INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, tenant_id, updated_at)
SELECT 
  c.customer_id,
  CASE 
    WHEN COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) >= 200000 THEN 'Platinum'
    WHEN COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) >= 50000 THEN 'Gold'
    ELSE 'Silver'
  END AS current_tier,
  COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) AS lifetime_points,
  c.tenant_id,
  NOW()
FROM customers c
LEFT JOIN points_ledger pl ON c.customer_id = pl.customer_id AND c.tenant_id = pl.tenant_id
GROUP BY c.customer_id, c.tenant_id
ON CONFLICT (customer_id) DO UPDATE
SET current_tier = EXCLUDED.current_tier,
    lifetime_points = EXCLUDED.lifetime_points,
    updated_at = NOW();
