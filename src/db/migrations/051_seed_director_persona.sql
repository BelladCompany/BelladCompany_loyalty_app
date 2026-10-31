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
INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
VALUES (
  'director',
  '$2a$10$vKCJPAiahRiL8.0l9XbB6.lKtmRq6NsoNxeos2XV8XURoKGV.3WDK',
  'director',
  1,
  'bellad_and_company'
)
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash, role = 'director', tenant_id = 'bellad_and_company';

-- Also ensure username 'agstya' is recognized with role 'director' (Password: Admin@123)
INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
VALUES (
  'agstya',
  '$2a$10$vKCJPAiahRiL8.0l9XbB6.lKtmRq6NsoNxeos2XV8XURoKGV.3WDK',
  'director',
  1,
  'bellad_and_company'
)
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash, role = 'director', tenant_id = 'bellad_and_company';

