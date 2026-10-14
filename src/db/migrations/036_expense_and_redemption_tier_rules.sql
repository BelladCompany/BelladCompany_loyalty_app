-- Migration 036: Expense and Redemption Customer Tier Rules (Silver, Gold, Platinum)

-- 1. Extend tier_rules and customer_tier_snapshot with expense amount fields
ALTER TABLE tier_rules
  ADD COLUMN IF NOT EXISTS min_expense_amount NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE customer_tier_snapshot
  ADD COLUMN IF NOT EXISTS total_expense_amount NUMERIC(12, 2) DEFAULT 0;

-- Ensure unique constraint on (tenant_id, tier_name) for idempotent upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tier_rules_tenant_tier'
  ) THEN
    ALTER TABLE tier_rules ADD CONSTRAINT uq_tier_rules_tenant_tier UNIQUE (tenant_id, tier_name);
  END IF;
END $$;

-- 2. Configure Silver, Gold, Platinum tier slabs based on total expense & redemption
-- Slabs:
--   Silver:   Default (₹0 - ₹49,999.99)
--   Gold:     ₹50,000 - ₹1,99,999.99
--   Platinum: ₹200,000+
INSERT INTO tier_rules (tenant_id, tier_name, min_lifetime_points, min_expense_amount, min_vehicles, benefits_json)
VALUES
  ('bellad_and_company', 'Silver', 0, 0.00, 0, '{"description": "Silver tier: Expense + Redemptions up to ₹49,999"}'),
  ('bellad_and_company', 'Gold', 5000, 50000.00, 0, '{"description": "Gold tier: Expense + Redemptions between ₹50,000 and ₹1,99,999"}'),
  ('bellad_and_company', 'Platinum', 15000, 200000.00, 0, '{"description": "Platinum tier: Expense + Redemptions ₹200,000 and above"}')
ON CONFLICT (tenant_id, tier_name) DO UPDATE
  SET min_expense_amount = EXCLUDED.min_expense_amount,
      benefits_json = EXCLUDED.benefits_json,
      updated_at = NOW();

-- Also ensure any other tenants have matching expense thresholds
UPDATE tier_rules
SET min_expense_amount = CASE
  WHEN tier_name = 'Platinum' THEN 200000.00
  WHEN tier_name = 'Gold' THEN 50000.00
  WHEN tier_name = 'Diamond' THEN 500000.00
  ELSE 0.00
END
WHERE min_expense_amount = 0 AND tier_name != 'Silver';

-- 3. Calculate and populate customer_tier_snapshot for all existing customers
WITH cust_sales AS (
  SELECT 
    st.customer_id,
    st.tenant_id,
    SUM(GREATEST(0, (st.ex_showroom_price_paise - COALESCE(st.dealer_cash_discount_paise, 0) - COALESCE(st.emps_discount_paise, 0) - COALESCE(st.oem_offers_amount_paise, 0)) / 100)) as sales_rs
  FROM sale_transactions st
  GROUP BY st.customer_id, st.tenant_id
),
cust_ledger_sales AS (
  SELECT 
    pl.customer_id,
    pl.tenant_id,
    SUM(pl.points * 100) as ledger_sales_rs
  FROM points_ledger pl
  WHERE pl.type = 'earn_sale'
  GROUP BY pl.customer_id, pl.tenant_id
),
cust_service AS (
  SELECT 
    st.customer_id,
    st.tenant_id,
    SUM(st.bill_amount_paise / 100) as service_rs
  FROM service_transactions st
  GROUP BY st.customer_id, st.tenant_id
),
cust_ledger_service AS (
  SELECT 
    pl.customer_id,
    pl.tenant_id,
    SUM(pl.points * 25) as ledger_service_rs
  FROM points_ledger pl
  WHERE pl.type IN ('earn_service', 'earn') AND pl.transaction_category = 'service'
  GROUP BY pl.customer_id, pl.tenant_id
),
cust_redemptions AS (
  SELECT 
    r.customer_id,
    r.tenant_id,
    SUM(r.discount_amount) as redemption_rs
  FROM redemptions r
  GROUP BY r.customer_id, r.tenant_id
),
cust_ledger_redemptions AS (
  SELECT 
    pl.customer_id,
    pl.tenant_id,
    SUM(ABS(pl.points) * 0.25) as ledger_redemption_rs
  FROM points_ledger pl
  WHERE pl.type = 'redeem'
  GROUP BY pl.customer_id, pl.tenant_id
),
cust_lifetime_points AS (
  SELECT
    pl.customer_id,
    pl.tenant_id,
    COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) as lifetime_pts
  FROM points_ledger pl
  GROUP BY pl.customer_id, pl.tenant_id
),
computed_metrics AS (
  SELECT 
    c.customer_id,
    c.tenant_id,
    COALESCE(clp.lifetime_pts, 0) as lifetime_points,
    ROUND(
      COALESCE(cs.sales_rs, cls.ledger_sales_rs, 0) +
      GREATEST(COALESCE(csv.service_rs, 0), COALESCE(clsv.ledger_service_rs, 0)) +
      GREATEST(COALESCE(crd.redemption_rs, 0), COALESCE(clrd.ledger_redemption_rs, 0)),
      2
    ) as total_metric_rs
  FROM customers c
  LEFT JOIN cust_sales cs ON c.customer_id = cs.customer_id AND c.tenant_id = cs.tenant_id
  LEFT JOIN cust_ledger_sales cls ON c.customer_id = cls.customer_id AND c.tenant_id = cls.tenant_id
  LEFT JOIN cust_service csv ON c.customer_id = csv.customer_id AND c.tenant_id = csv.tenant_id
  LEFT JOIN cust_ledger_service clsv ON c.customer_id = clsv.customer_id AND c.tenant_id = clsv.tenant_id
  LEFT JOIN cust_redemptions crd ON c.customer_id = crd.customer_id AND c.tenant_id = crd.tenant_id
  LEFT JOIN cust_ledger_redemptions clrd ON c.customer_id = clrd.customer_id AND c.tenant_id = clrd.tenant_id
  LEFT JOIN cust_lifetime_points clp ON c.customer_id = clp.customer_id AND c.tenant_id = clp.tenant_id
)
INSERT INTO customer_tier_snapshot (customer_id, tenant_id, current_tier, lifetime_points, total_expense_amount, updated_at)
SELECT
  cm.customer_id,
  cm.tenant_id,
  CASE 
    WHEN cm.total_metric_rs >= 200000.00 THEN 'Platinum'
    WHEN cm.total_metric_rs >= 50000.00 THEN 'Gold'
    ELSE 'Silver'
  END AS current_tier,
  cm.lifetime_points,
  cm.total_metric_rs,
  NOW()
FROM computed_metrics cm
ON CONFLICT (customer_id) DO UPDATE
  SET current_tier = EXCLUDED.current_tier,
      lifetime_points = EXCLUDED.lifetime_points,
      total_expense_amount = EXCLUDED.total_expense_amount,
      updated_at = NOW();
