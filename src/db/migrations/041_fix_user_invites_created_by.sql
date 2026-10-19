-- Migration 041: Alter user_invites created_by to VARCHAR(64) to support both numeric and UUID user identifiers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invites' AND column_name = 'created_by' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE user_invites ALTER COLUMN created_by TYPE VARCHAR(64) USING created_by::text;
  END IF;
END $$;
