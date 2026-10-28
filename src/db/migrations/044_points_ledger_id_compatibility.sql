-- 044_points_ledger_id_compatibility.sql
-- Ensure points_ledger supports both entry_id and id seamlessly across environments

DO $$
BEGIN
  -- 1. Ensure entry_id column exists on points_ledger
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'entry_id'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN entry_id BIGINT;
  END IF;

  -- 2. Ensure id column exists on points_ledger
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'id'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN id BIGINT;
  END IF;

  -- 3. Backfill values between id and entry_id if needed
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_prevent_points_ledger_modification' 
      AND tgrelid = 'points_ledger'::regclass
  ) THEN
    ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points_ledger' AND column_name = 'id') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points_ledger' AND column_name = 'entry_id') THEN
    UPDATE points_ledger SET entry_id = id WHERE entry_id IS NULL AND id IS NOT NULL;
    UPDATE points_ledger SET id = entry_id WHERE id IS NULL AND entry_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_prevent_points_ledger_modification' 
      AND tgrelid = 'points_ledger'::regclass
  ) THEN
    ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
  END IF;

  -- 4. Ensure entry_id has a UNIQUE or PRIMARY KEY constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'points_ledger' 
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      AND kcu.column_name = 'entry_id'
  ) THEN
    ALTER TABLE points_ledger ADD CONSTRAINT uq_points_ledger_entry_id UNIQUE (entry_id);
  END IF;

  -- 5. Ensure id has a UNIQUE or PRIMARY KEY constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'points_ledger' 
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      AND kcu.column_name = 'id'
  ) THEN
    ALTER TABLE points_ledger ADD CONSTRAINT uq_points_ledger_id UNIQUE (id);
  END IF;
END $$;

-- 6. Trigger to automatically keep id and entry_id synchronized on new inserts
CREATE OR REPLACE FUNCTION sync_points_ledger_id_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_id IS NULL AND NEW.id IS NOT NULL THEN
    NEW.entry_id := NEW.id;
  ELSIF NEW.id IS NULL AND NEW.entry_id IS NOT NULL THEN
    NEW.id := NEW.entry_id;
  ELSIF NEW.id IS NULL AND NEW.entry_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'points_ledger_id_seq') THEN
      NEW.id := nextval('points_ledger_id_seq');
      NEW.entry_id := NEW.id;
    ELSIF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'points_ledger_entry_id_seq') THEN
      NEW.entry_id := nextval('points_ledger_entry_id_seq');
      NEW.id := NEW.entry_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_points_ledger_id_columns ON points_ledger;
CREATE TRIGGER trg_sync_points_ledger_id_columns
BEFORE INSERT ON points_ledger
FOR EACH ROW
EXECUTE FUNCTION sync_points_ledger_id_columns();
