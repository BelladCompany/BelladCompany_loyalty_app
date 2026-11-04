-- 057_branches_harmonization.sql
-- Harmonize branches table columns (branch_id / id, branch_name / name, branch_city / code)
-- Ensures backwards-compatibility for all join queries

DO $$
BEGIN
  -- 1. Ensure id column exists as alias to branch_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name = 'id'
  ) THEN
    ALTER TABLE branches ADD COLUMN id INTEGER;
    UPDATE branches SET id = branch_id WHERE id IS NULL;
  END IF;

  -- 2. Ensure name column exists as alias to branch_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name = 'name'
  ) THEN
    ALTER TABLE branches ADD COLUMN name VARCHAR(255);
    UPDATE branches SET name = branch_name WHERE name IS NULL;
  END IF;

  -- 3. Ensure code column exists as alias to branch_city
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name = 'code'
  ) THEN
    ALTER TABLE branches ADD COLUMN code VARCHAR(50);
    UPDATE branches SET code = COALESCE(branch_city, 'Hubballi') WHERE code IS NULL;
  END IF;

  -- 4. Ensure sync trigger for branches
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

  DROP TRIGGER IF EXISTS trg_sync_branches_columns ON branches;
  CREATE TRIGGER trg_sync_branches_columns
    BEFORE INSERT OR UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION sync_branches_columns();

END $$;
