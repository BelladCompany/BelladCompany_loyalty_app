-- 057_branches_harmonization.sql
-- Harmonize branches table columns (branch_id / id, branch_name / name, branch_city / code)
-- Ensures backwards-compatibility for all join queries

DO $$
BEGIN
  -- Temporarily drop trigger to allow column alterations
  DROP TRIGGER IF EXISTS trg_sync_branches_columns ON branches;

  -- 1. Ensure all columns exist on branches table
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_id INTEGER;
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS id INTEGER;
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS name VARCHAR(255);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_city VARCHAR(50);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(50);

  -- 2. Sync existing data
  UPDATE branches SET branch_id = id WHERE branch_id IS NULL;
  UPDATE branches SET id = branch_id WHERE id IS NULL;
  UPDATE branches SET branch_name = name WHERE branch_name IS NULL;
  UPDATE branches SET name = branch_name WHERE name IS NULL;
  UPDATE branches SET branch_city = code WHERE branch_city IS NULL;
  UPDATE branches SET code = branch_city WHERE code IS NULL;

  -- 3. Ensure sync trigger for branches
  CREATE OR REPLACE FUNCTION sync_branches_columns()
  RETURNS TRIGGER AS $trig$
  BEGIN
    IF NEW.branch_id IS NULL AND NEW.id IS NOT NULL THEN
      NEW.branch_id := NEW.id;
    ELSIF NEW.id IS NULL AND NEW.branch_id IS NOT NULL THEN
      NEW.id := NEW.branch_id;
    END IF;

    IF NEW.branch_name IS NULL AND NEW.name IS NOT NULL THEN
      NEW.branch_name := NEW.name;
    ELSIF NEW.name IS NULL AND NEW.branch_name IS NOT NULL THEN
      NEW.name := NEW.branch_name;
    END IF;

    IF NEW.code IS NULL AND NEW.branch_city IS NOT NULL THEN
      NEW.code := NEW.branch_city;
    ELSIF NEW.branch_city IS NULL AND NEW.code IS NOT NULL THEN
      NEW.branch_city := NEW.code;
    END IF;

    RETURN NEW;
  END;
  $trig$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_sync_branches_columns
    BEFORE INSERT OR UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION sync_branches_columns();

END $$;
