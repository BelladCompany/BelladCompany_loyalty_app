-- Migration 030: Ensure users table has id column for legacy and backward query compatibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') THEN
    ALTER TABLE users ADD COLUMN id INT;
    UPDATE users SET id = user_id WHERE id IS NULL;
  END IF;
END
$$;
