-- Migration 058: Seed core login users (admin, cashier, kavya) for production authentication
-- Harmonize branches columns safely before inserting default branches and users

DO $$
DECLARE
  v_branch_id INTEGER;
BEGIN
  -- 0. Temporarily drop sync trigger to prevent 'record new has no field branch_id' error
  DROP TRIGGER IF EXISTS trg_sync_branches_columns ON branches;

  -- 1. Ensure all columns exist on branches table
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_id INTEGER;
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS id INTEGER;
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS name VARCHAR(255);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_city VARCHAR(50);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(50);

  -- Sync existing branch columns
  UPDATE branches SET branch_id = id WHERE branch_id IS NULL;
  UPDATE branches SET id = branch_id WHERE id IS NULL;
  UPDATE branches SET branch_name = name WHERE branch_name IS NULL;
  UPDATE branches SET name = branch_name WHERE name IS NULL;
  UPDATE branches SET branch_city = code WHERE branch_city IS NULL;
  UPDATE branches SET code = branch_city WHERE code IS NULL;

  -- Re-attach safe sync trigger
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

  -- 2. Ensure default firm exists
  INSERT INTO firms (tenant_id, firm_name, legal_name, brand_slug, theme_color, accent_color, point_to_rupee_rate, contact_email)
  VALUES ('bellad_and_company', 'Bellad & Company', 'Bellad Automobile Corporation Pvt Ltd', 'bellad', '#0f172a', '#f97316', 0.25, 'support@bellad.co.in')
  ON CONFLICT (tenant_id) DO NOTHING;

  -- 3. Ensure default branch exists
  IF NOT EXISTS (SELECT 1 FROM branches WHERE tenant_id = 'bellad_and_company') THEN
    INSERT INTO branches (name, code, address, tenant_id)
    VALUES ('Central Showroom - Hubli', 'HUB-01', 'Hubli Central', 'bellad_and_company');
  END IF;

  SELECT COALESCE(
    (SELECT branch_id FROM branches WHERE tenant_id = 'bellad_and_company' LIMIT 1),
    (SELECT id FROM branches WHERE tenant_id = 'bellad_and_company' LIMIT 1),
    1
  ) INTO v_branch_id;

  -- 4. Seed admin user (Password: Admin@123 or admin@123)
  IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = 'admin') THEN
    UPDATE users 
    SET password_hash = '$2a$10$PKhkEUW3UgdSsZat1wEd2uDvLmrVi2OBHqFQAFmObxanY5f5B6LJm',
        role = 'admin',
        branch_id = v_branch_id,
        tenant_id = 'bellad_and_company'
    WHERE LOWER(username) = 'admin';
  ELSE
    INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
    VALUES ('admin', '$2a$10$PKhkEUW3UgdSsZat1wEd2uDvLmrVi2OBHqFQAFmObxanY5f5B6LJm', 'admin', v_branch_id, 'bellad_and_company');
  END IF;

  -- 5. Seed cashier user (Password: Cashier@123)
  IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = 'cashier') THEN
    UPDATE users 
    SET password_hash = '$2a$10$pBB9I12KZwp51dYssAUwyew9bnMcQrWiBT0.dhRZCc6kPzbm9P/pO',
        role = 'cashier',
        branch_id = v_branch_id,
        tenant_id = 'bellad_and_company'
    WHERE LOWER(username) = 'cashier';
  ELSE
    INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
    VALUES ('cashier', '$2a$10$pBB9I12KZwp51dYssAUwyew9bnMcQrWiBT0.dhRZCc6kPzbm9P/pO', 'cashier', v_branch_id, 'bellad_and_company');
  END IF;

  -- 6. Seed kavya manager user (Password: kav@2026)
  IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = 'kavya') THEN
    UPDATE users 
    SET password_hash = '$2a$10$yRhNlH5EJ.n2eqBd/7Yizu27hU.XhkC03xNm.j80rlY.VeRBfcXp2',
        role = 'manager',
        branch_id = v_branch_id,
        tenant_id = 'bellad_and_company'
    WHERE LOWER(username) = 'kavya';
  ELSE
    INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
    VALUES ('kavya', '$2a$10$yRhNlH5EJ.n2eqBd/7Yizu27hU.XhkC03xNm.j80rlY.VeRBfcXp2', 'manager', v_branch_id, 'bellad_and_company');
  END IF;

END $$;
