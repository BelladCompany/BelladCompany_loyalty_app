-- 026_point_rules.sql
-- In-house Service Bonus Points Rules Schema & Seed Data

ALTER TABLE point_rules DROP CONSTRAINT IF EXISTS point_rules_rate_type_check;

ALTER TABLE point_rules ALTER COLUMN rate_type DROP NOT NULL;
ALTER TABLE point_rules ALTER COLUMN points_per_100 DROP NOT NULL;
ALTER TABLE point_rules ALTER COLUMN effective_from SET DEFAULT CURRENT_DATE;
ALTER TABLE point_rules ALTER COLUMN effective_from DROP NOT NULL;

ALTER TABLE point_rules
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(16) DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(32),
  ADD COLUMN IF NOT EXISTS condition_value VARCHAR(100),
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Unique constraint for service bonus rules per tenant, vehicle_type, and service_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_point_rules_service_bonus'
  ) THEN
    ALTER TABLE point_rules ADD CONSTRAINT uq_point_rules_service_bonus UNIQUE (tenant_id, vehicle_type, service_type);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Seed default in-house service bonus rules for default tenants (2W and 4W separate entries)
INSERT INTO point_rules (tenant_id, vehicle_type, service_type, condition_value, points)
VALUES
  -- bellad_and_company (2W)
  ('bellad_and_company', '2W', 'finance', 'in_house', 100),
  ('bellad_and_company', '2W', 'insurance', 'in_house', 50),
  ('bellad_and_company', '2W', 'exchange', 'yes', 200),
  -- bellad_and_company (4W)
  ('bellad_and_company', '4W', 'finance', 'in_house', 100),
  ('bellad_and_company', '4W', 'insurance', 'in_house', 50),
  ('bellad_and_company', '4W', 'exchange', 'yes', 200),
  -- BAC-MAIN (2W)
  ('BAC-MAIN', '2W', 'finance', 'in_house', 100),
  ('BAC-MAIN', '2W', 'insurance', 'in_house', 50),
  ('BAC-MAIN', '2W', 'exchange', 'yes', 200),
  -- BAC-MAIN (4W)
  ('BAC-MAIN', '4W', 'finance', 'in_house', 100),
  ('BAC-MAIN', '4W', 'insurance', 'in_house', 50),
  ('BAC-MAIN', '4W', 'exchange', 'yes', 200)
ON CONFLICT DO NOTHING;
