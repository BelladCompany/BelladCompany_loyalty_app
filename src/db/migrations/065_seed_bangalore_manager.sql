-- Migration 065: Seed Bangalore Branch Manager user for location-scoped reports and operations
-- Associates manager_bangalore with Bangalore branch (Branch ID 15: Tata Motors Bommasandra Bangalore)

DO $$
DECLARE
  v_bangalore_branch_id INTEGER;
  v_password_hash VARCHAR(255) := '$2a$10$fkbmOJpyr3t79Q7ITOr.FuQSTVj8n2PfrC58iQhHGBKuAnxLGx6Qy'; -- Manager@123
BEGIN
  -- 1. Find Bangalore branch (prefer Branch 15 Bommasandra, or any Bangalore city branch)
  SELECT branch_id INTO v_bangalore_branch_id
  FROM branches
  WHERE branch_id = 15 AND tenant_id = 'bellad_and_company'
  LIMIT 1;

  IF v_bangalore_branch_id IS NULL THEN
    SELECT COALESCE(branch_id, id, 15) INTO v_bangalore_branch_id
    FROM branches
    WHERE (LOWER(branch_city) = 'bangalore' OR LOWER(name) LIKE '%bangalore%' OR LOWER(branch_name) LIKE '%bangalore%')
      AND tenant_id = 'bellad_and_company'
    ORDER BY branch_id ASC
    LIMIT 1;
  END IF;

  IF v_bangalore_branch_id IS NULL THEN
    v_bangalore_branch_id := 15;
  END IF;

  -- 2. Seed manager_bangalore (Password: Manager@123)
  IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = 'manager_bangalore') THEN
    UPDATE users
    SET password_hash = v_password_hash,
        role = 'branch_manager',
        branch_id = v_bangalore_branch_id,
        tenant_id = 'bellad_and_company'
    WHERE LOWER(username) = 'manager_bangalore';
  ELSE
    INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
    VALUES ('manager_bangalore', v_password_hash, 'branch_manager', v_bangalore_branch_id, 'bellad_and_company');
  END IF;

  -- 3. Also seed manager-bangalore hyphenated alias for convenience
  IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = 'manager-bangalore') THEN
    UPDATE users
    SET password_hash = v_password_hash,
        role = 'branch_manager',
        branch_id = v_bangalore_branch_id,
        tenant_id = 'bellad_and_company'
    WHERE LOWER(username) = 'manager-bangalore';
  ELSE
    INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
    VALUES ('manager-bangalore', v_password_hash, 'branch_manager', v_bangalore_branch_id, 'bellad_and_company');
  END IF;

  -- 4. Synchronize user_id and id columns
  UPDATE users SET user_id = id WHERE user_id IS NULL AND id IS NOT NULL;
  UPDATE users SET id = user_id WHERE id IS NULL AND user_id IS NOT NULL;

END $$;
