-- 055_director_and_realbooks_compatibility.sql
-- Ensure points_ledger and realbooks_sync_log have all compatibility columns for Director Command Center & RealBooks Sync

DO $$
BEGIN
  -- 1. Ensure calc_snapshot JSONB column exists on points_ledger
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'calc_snapshot'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN calc_snapshot JSONB;
  END IF;

  -- 2. Ensure sync_id and compatibility columns exist on realbooks_sync_log
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'realbooks_sync_log'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'realbooks_sync_log' AND column_name = 'sync_id'
    ) THEN
      ALTER TABLE realbooks_sync_log ADD COLUMN sync_id INT;
      UPDATE realbooks_sync_log SET sync_id = id WHERE sync_id IS NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'realbooks_sync_log' AND column_name = 'entity_id'
    ) THEN
      ALTER TABLE realbooks_sync_log ADD COLUMN entity_id VARCHAR(100);
      UPDATE realbooks_sync_log SET entity_id = redemption_code WHERE entity_id IS NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'realbooks_sync_log' AND column_name = 'entity_type'
    ) THEN
      ALTER TABLE realbooks_sync_log ADD COLUMN entity_type VARCHAR(50) DEFAULT 'redemption';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'realbooks_sync_log' AND column_name = 'api_status'
    ) THEN
      ALTER TABLE realbooks_sync_log ADD COLUMN api_status VARCHAR(50);
      UPDATE realbooks_sync_log SET api_status = status WHERE api_status IS NULL;
    END IF;
  END IF;
END $$;

