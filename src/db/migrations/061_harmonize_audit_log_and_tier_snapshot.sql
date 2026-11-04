-- Migration 061: Harmonize audit_log, customer_tier_snapshot, brands, and point_rules
-- Ensures identical, resilient schemas across Local, Render, and Vercel environments.

DO $$
BEGIN
  -- 1. Harmonize audit_log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS before_values JSONB;
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS after_values JSONB;
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS metadata JSONB;
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS before_json JSONB;
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS after_json JSONB;

    -- Sync data between alternative column conventions
    UPDATE audit_log SET before_values = before_json WHERE before_values IS NULL AND before_json IS NOT NULL;
    UPDATE audit_log SET after_values = after_json WHERE after_values IS NULL AND after_json IS NOT NULL;
    UPDATE audit_log SET before_json = before_values WHERE before_json IS NULL AND before_values IS NOT NULL;
    UPDATE audit_log SET after_json = after_values WHERE after_json IS NULL AND after_values IS NOT NULL;
  END IF;

  -- 2. Harmonize customer_tier_snapshot
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS tier_name VARCHAR(50);
    ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS current_tier VARCHAR(50);
    ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS current_balance BIGINT DEFAULT 0;
    ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS lifetime_points BIGINT DEFAULT 0;
    ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS total_expense_amount NUMERIC(12, 2) DEFAULT 0;

    -- Drop rigid NOT NULL constraints so either convention works seamlessly
    ALTER TABLE customer_tier_snapshot ALTER COLUMN tier_name DROP NOT NULL;
    ALTER TABLE customer_tier_snapshot ALTER COLUMN current_tier DROP NOT NULL;

    UPDATE customer_tier_snapshot SET tier_name = current_tier WHERE tier_name IS NULL AND current_tier IS NOT NULL;
    UPDATE customer_tier_snapshot SET current_tier = tier_name WHERE current_tier IS NULL AND tier_name IS NOT NULL;
  END IF;

  -- 3. Harmonize brands
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_name VARCHAR(100);
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS name VARCHAR(100);
    ALTER TABLE brands ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE brands ALTER COLUMN brand_name DROP NOT NULL;

    UPDATE brands SET name = brand_name WHERE name IS NULL AND brand_name IS NOT NULL;
    UPDATE brands SET brand_name = name WHERE brand_name IS NULL AND name IS NOT NULL;
  END IF;

  -- 4. Harmonize point_rules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'point_rules') THEN
    ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS points_per_100 NUMERIC(10, 4);
    ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS rate_type VARCHAR(50);
    ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS rule_type VARCHAR(50);

    UPDATE point_rules SET points_per_100 = (multiplier_numerator::numeric / multiplier_denominator::numeric) * 100
    WHERE points_per_100 IS NULL AND multiplier_denominator IS NOT NULL AND multiplier_denominator > 0;

    UPDATE point_rules SET rate_type = rule_type WHERE rate_type IS NULL AND rule_type IS NOT NULL;
    UPDATE point_rules SET rule_type = rate_type WHERE rule_type IS NULL AND rate_type IS NOT NULL;
  END IF;
END $$;

