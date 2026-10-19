-- Migration 042: Ensure tier_rules table has id column and all required tier columns
DO $$
BEGIN
  -- 1. Ensure id column exists and is populated from tier_rule_id if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_rules' AND column_name = 'tier_rule_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_rules' AND column_name = 'id'
  ) THEN
    ALTER TABLE tier_rules ADD COLUMN id INT;
    UPDATE tier_rules SET id = tier_rule_id;
  END IF;

  -- 2. Ensure dynamic priority tier columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tier_rules' AND column_name = 'eval_basis') THEN
    ALTER TABLE tier_rules ADD COLUMN eval_basis VARCHAR(32) DEFAULT 'expenses_based';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tier_rules' AND column_name = 'discounts_json') THEN
    ALTER TABLE tier_rules ADD COLUMN discounts_json JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tier_rules' AND column_name = 'min_expense_amount') THEN
    ALTER TABLE tier_rules ADD COLUMN min_expense_amount NUMERIC(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tier_rules' AND column_name = 'max_expense_amount') THEN
    ALTER TABLE tier_rules ADD COLUMN max_expense_amount NUMERIC(12, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tier_rules' AND column_name = 'applicable_from') THEN
    ALTER TABLE tier_rules ADD COLUMN applicable_from TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tier_rules' AND column_name = 'applicable_upto') THEN
    ALTER TABLE tier_rules ADD COLUMN applicable_upto TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 years');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tier_rules' AND column_name = 'approval_status') THEN
    ALTER TABLE tier_rules ADD COLUMN approval_status VARCHAR(32) DEFAULT 'approved';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tier_rules' AND column_name = 'approved_by') THEN
    ALTER TABLE tier_rules ADD COLUMN approved_by VARCHAR(100) DEFAULT 'Director';
  END IF;
END $$;
