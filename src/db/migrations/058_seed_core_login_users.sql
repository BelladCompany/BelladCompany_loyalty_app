-- Migration 058: Seed core login users (admin, cashier, kavya) for production authentication
DO $$
DECLARE
  v_branch_id INTEGER;
BEGIN
  -- 1. Ensure default firm exists
  INSERT INTO firms (tenant_id, firm_name, legal_name, brand_slug, theme_color, accent_color, point_to_rupee_rate, contact_email)
  VALUES ('bellad_and_company', 'Bellad & Company', 'Bellad Automobile Corporation Pvt Ltd', 'bellad', '#0f172a', '#f97316', 0.25, 'support@bellad.co.in')
  ON CONFLICT (tenant_id) DO NOTHING;

  -- 2. Ensure default branch exists
  IF NOT EXISTS (SELECT 1 FROM branches WHERE tenant_id = 'bellad_and_company') THEN
    INSERT INTO branches (name, code, address, tenant_id)
    VALUES ('Central Showroom - Hubli', 'HUB-01', 'Hubli Central', 'bellad_and_company');
  END IF;

  SELECT COALESCE(
    (SELECT branch_id FROM branches WHERE tenant_id = 'bellad_and_company' LIMIT 1),
    (SELECT id FROM branches WHERE tenant_id = 'bellad_and_company' LIMIT 1),
    1
  ) INTO v_branch_id;

  -- 3. Seed admin user (Password: Admin@123 or admin@123)
  INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
  VALUES ('admin', '$2a$10$PKhkEUW3UgdSsZat1wEd2uDvLmrVi2OBHqFQAFmObxanY5f5B6LJm', 'admin', v_branch_id, 'bellad_and_company')
  ON CONFLICT (tenant_id, username) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash, role = 'admin', branch_id = EXCLUDED.branch_id;

  -- 4. Seed cashier user (Password: Cashier@123)
  INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
  VALUES ('cashier', '$2a$10$pBB9I12KZwp51dYssAUwyew9bnMcQrWiBT0.dhRZCc6kPzbm9P/pO', 'cashier', v_branch_id, 'bellad_and_company')
  ON CONFLICT (tenant_id, username) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash, role = 'cashier', branch_id = EXCLUDED.branch_id;

  -- 5. Seed kavya manager user (Password: kav@2026)
  INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
  VALUES ('kavya', '$2a$10$yRhNlH5EJ.n2eqBd/7Yizu27hU.XhkC03xNm.j80rlY.VeRBfcXp2', 'manager', v_branch_id, 'bellad_and_company')
  ON CONFLICT (tenant_id, username) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash, role = 'manager', branch_id = EXCLUDED.branch_id;

END $$;
