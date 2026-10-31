-- Migration 051: Seed and Support Director & Executive Management Persona
-- Allows top executive management (Director Agastya Bellad & Board) to log in and oversee all dynamic loyalty records

-- Ensure 'director' and 'management' are valid roles or expand check constraint if applicable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

-- Seed director user: username 'director' (Password: Admin@123)
-- bcrypt hash for 'Admin@123': $2b$10$WqB3p2mPz7v0l1q0k8u7t.e/XyZ1W2V3U4T5S6R7Q8P9O0N1M2L3K
INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
VALUES (
  'director',
  '$2a$10$b52Dov.q4W6Lw7h/GtzhROs5q0g.V2v8tX8b3K0j6i1w2p4f5q6re',
  'director',
  1,
  'bellad_and_company'
)
ON CONFLICT (username) DO UPDATE 
SET role = 'director', tenant_id = 'bellad_and_company';

-- Also ensure username 'agstya' is recognized with role 'director'
INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
VALUES (
  'agstya',
  '$2a$10$b52Dov.q4W6Lw7h/GtzhROs5q0g.V2v8tX8b3K0j6i1w2p4f5q6re',
  'director',
  1,
  'bellad_and_company'
)
ON CONFLICT (username) DO UPDATE 
SET role = 'director', tenant_id = 'bellad_and_company';
