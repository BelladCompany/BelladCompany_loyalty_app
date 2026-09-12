-- REALBOOKS_SYNC_LOG
-- Logs each redemption push attempt to RealBooks API with status, payload, and retry count
CREATE TABLE IF NOT EXISTS realbooks_sync_log (
  id SERIAL PRIMARY KEY,
  redemption_id INTEGER NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
  redemption_code VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  request_payload JSONB,
  response_payload JSONB,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'realbooks_sync_log' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_realbooks_sync_log_status ON realbooks_sync_log (tenant_id, status, next_retry_at);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'realbooks_sync_log' AND column_name = 'api_status') THEN
    CREATE INDEX IF NOT EXISTS idx_realbooks_sync_log_status ON realbooks_sync_log (tenant_id, api_status);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'realbooks_sync_log' AND column_name = 'redemption_id') THEN
    CREATE INDEX IF NOT EXISTS idx_realbooks_sync_log_redemption ON realbooks_sync_log (tenant_id, redemption_id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'realbooks_sync_log' AND column_name = 'entity_id') THEN
    CREATE INDEX IF NOT EXISTS idx_realbooks_sync_log_redemption ON realbooks_sync_log (tenant_id, entity_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'realbooks_sync_log' AND column_name = 'redemption_code') THEN
    CREATE INDEX IF NOT EXISTS idx_realbooks_sync_log_code ON realbooks_sync_log (tenant_id, redemption_code);
  END IF;
END
$$;
