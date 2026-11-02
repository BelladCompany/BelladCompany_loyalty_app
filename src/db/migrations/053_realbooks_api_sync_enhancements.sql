-- 053_realbooks_api_sync_enhancements.sql
-- Adds request_payload and response_payload columns to realbooks_sync_log
-- for capturing RealBooks API requests and responses

ALTER TABLE realbooks_sync_log 
  ADD COLUMN IF NOT EXISTS request_payload JSONB,
  ADD COLUMN IF NOT EXISTS response_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_realbooks_sync_log_created_at ON realbooks_sync_log (created_at DESC);

