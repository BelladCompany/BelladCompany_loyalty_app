-- Migration 064: Harmonize users and branches columns for robust cloud (Render) and local authentication
-- Ensures id and user_id are always synchronized, role constraints do not block user creation,
-- and standard seed accounts are resiliently prepared.

DO $$
BEGIN
  -- 1. Ensure id and user_id columns exist on users
  ALTER TABLE users ADD COLUMN IF NOT EXISTS id INT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id INT;

  -- 2. Synchronize existing records
  UPDATE users SET id = user_id WHERE id IS NULL AND user_id IS NOT NULL;
  UPDATE users SET user_id = id WHERE user_id IS NULL AND id IS NOT NULL;

  -- 3. Ensure role check constraint is dropped so any role is valid
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;

  -- 4. Ensure branches table has both branch_id and id synchronized
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_id INT;
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS id INT;
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS name VARCHAR(255);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_city VARCHAR(50);
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(50);

  UPDATE branches SET branch_id = id WHERE branch_id IS NULL AND id IS NOT NULL;
  UPDATE branches SET id = branch_id WHERE id IS NULL AND branch_id IS NOT NULL;
  UPDATE branches SET branch_name = name WHERE branch_name IS NULL AND name IS NOT NULL;
  UPDATE branches SET name = branch_name WHERE name IS NULL AND branch_name IS NOT NULL;
  UPDATE branches SET branch_city = code WHERE branch_city IS NULL AND code IS NOT NULL;
  UPDATE branches SET code = branch_city WHERE code IS NULL AND branch_city IS NOT NULL;
END $$;

-- 5. Trigger to automatically keep id and user_id identical on every user insert/update
CREATE OR REPLACE FUNCTION sync_users_id_columns()
RETURNS TRIGGER AS $trig$
BEGIN
  IF NEW.user_id IS NULL AND NEW.id IS NOT NULL THEN
    NEW.user_id := NEW.id;
  ELSIF NEW.id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.id := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$trig$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_users_id_columns ON users;
CREATE TRIGGER trg_sync_users_id_columns
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_users_id_columns();

-- 6. Synchronize default cashier-bangluru password to Cashier@123
UPDATE users
SET password_hash = '$2a$10$pBB9I12KZwp51dYssAUwyew9bnMcQrWiBT0.dhRZCc6kPzbm9P/pO'
WHERE username = 'cashier-bangluru';

