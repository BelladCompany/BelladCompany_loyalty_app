-- 1. POINT_RULES (Configurable point calculation rules with integer numerator/denominator)
CREATE TABLE IF NOT EXISTS point_rules (
  id SERIAL PRIMARY KEY,
  rule_type VARCHAR(32) NOT NULL, -- 'sale', 'service'
  multiplier_numerator BIGINT NOT NULL,
  multiplier_denominator BIGINT NOT NULL,
  description TEXT,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_point_rules_tenant_type UNIQUE (tenant_id, rule_type)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'point_rules' AND column_name = 'rate_type') THEN
    INSERT INTO point_rules (rate_type, points_per_100, tenant_id)
    VALUES 
      ('sale', 1.00, 'BAC-MAIN'),
      ('service', 4.00, 'BAC-MAIN')
    ON CONFLICT DO NOTHING;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'point_rules' AND column_name = 'rule_type') THEN
    INSERT INTO point_rules (rule_type, multiplier_numerator, multiplier_denominator, description, tenant_id)
    VALUES 
      ('sale', 1, 100, 'Sale points: ex-showroom price / 100', 'BAC-MAIN'),
      ('service', 4, 100, 'Service points: (bill amount / 100) * 4', 'BAC-MAIN')
    ON CONFLICT (tenant_id, rule_type) DO NOTHING;
  END IF;
END
$$;

-- 2. CUSTOMER_TIER_SNAPSHOT (Stores the calculated current tier and balance snapshot for each customer)
CREATE TABLE IF NOT EXISTS customer_tier_snapshot (
  customer_id VARCHAR(32) PRIMARY KEY REFERENCES customers(customer_id) ON DELETE CASCADE,
  tier_id INTEGER REFERENCES tier_rules(id) ON DELETE SET NULL,
  tier_name VARCHAR(50) NOT NULL,
  lifetime_points BIGINT NOT NULL DEFAULT 0,
  current_balance BIGINT NOT NULL DEFAULT 0,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_tier_snapshot_tenant ON customer_tier_snapshot (tenant_id);
