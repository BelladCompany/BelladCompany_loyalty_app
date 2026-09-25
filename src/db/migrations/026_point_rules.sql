-- 026_point_rules.sql
-- In-house Service Bonus Points Rules Schema & Seed Data

ALTER TABLE point_rules DROP CONSTRAINT IF EXISTS point_rules_rate_type_check;
ALTER TABLE point_rules DROP CONSTRAINT IF EXISTS point_rules_rule_type_check;

ALTER TABLE point_rules ADD CONSTRAINT point_rules_rule_type_check 
  CHECK (rule_type IN ('sale', 'service', 'accessory', 'bodyshop', 'finance', 'insurance', 'exchange'));

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
INSERT INTO point_rules (tenant_id, rule_type, vehicle_type, service_type, condition_value, points, multiplier_numerator, multiplier_denominator, description)
VALUES
  -- bellad_and_company (2W)
  ('bellad_and_company', 'finance', '2W', 'finance', 'in_house', 100, 100, 1, 'In-house finance bonus - 2W'),
  ('bellad_and_company', 'insurance', '2W', 'insurance', 'in_house', 50, 50, 1, 'In-house insurance bonus - 2W'),
  ('bellad_and_company', 'exchange', '2W', 'exchange', 'yes', 200, 200, 1, 'Exchange bonus - 2W'),
  -- bellad_and_company (4W)
  ('bellad_and_company', 'finance', '4W', 'finance', 'in_house', 100, 100, 1, 'In-house finance bonus - 4W'),
  ('bellad_and_company', 'insurance', '4W', 'insurance', 'in_house', 50, 50, 1, 'In-house insurance bonus - 4W'),
  ('bellad_and_company', 'exchange', '4W', 'exchange', 'yes', 200, 200, 1, 'Exchange bonus - 4W'),
  -- BAC-MAIN (2W)
  ('BAC-MAIN', 'finance', '2W', 'finance', 'in_house', 100, 100, 1, 'In-house finance bonus - 2W'),
  ('BAC-MAIN', 'insurance', '2W', 'insurance', 'in_house', 50, 50, 1, 'In-house insurance bonus - 2W'),
  ('BAC-MAIN', 'exchange', '2W', 'exchange', 'yes', 200, 200, 1, 'Exchange bonus - 2W'),
  -- BAC-MAIN (4W)
  ('BAC-MAIN', 'finance', '4W', 'finance', 'in_house', 100, 100, 1, 'In-house finance bonus - 4W'),
  ('BAC-MAIN', 'insurance', '4W', 'insurance', 'in_house', 50, 50, 1, 'In-house insurance bonus - 4W'),
  ('BAC-MAIN', 'exchange', '4W', 'exchange', 'yes', 200, 200, 1, 'Exchange bonus - 4W')
ON CONFLICT DO NOTHING;
