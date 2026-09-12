-- 014: AppSheet Webhook Log Migration
-- ------------------------------------------------------------
-- Creates appsheet_webhook_log table for tracking AppSheet transaction webhooks

CREATE TABLE IF NOT EXISTS appsheet_webhook_log (
  id              SERIAL PRIMARY KEY,
  appsheet_row_id VARCHAR(100),
  payload         JSONB,
  result          VARCHAR(20) NOT NULL CHECK (result IN ('success', 'duplicate', 'not_found', 'error')),
  error_message   TEXT,
  tenant_id       VARCHAR(64) NOT NULL DEFAULT 'BAC-MAIN',
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appsheet_webhook_log_row_id ON appsheet_webhook_log (appsheet_row_id);
CREATE INDEX IF NOT EXISTS idx_appsheet_webhook_log_received_at ON appsheet_webhook_log (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_appsheet_webhook_log_tenant ON appsheet_webhook_log (tenant_id);

-- Expand transaction table source check constraints to accept 'appsheet_bot'
ALTER TABLE service_transactions DROP CONSTRAINT IF EXISTS service_transactions_source_check;
ALTER TABLE service_transactions ADD CONSTRAINT service_transactions_source_check CHECK (source IN ('auto_dms', 'manual', 'appsheet_bot'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_transactions') THEN
    ALTER TABLE sale_transactions DROP CONSTRAINT IF EXISTS sale_transactions_source_check;
    ALTER TABLE sale_transactions ADD CONSTRAINT sale_transactions_source_check CHECK (source IN ('auto_dms', 'manual', 'appsheet_bot'));
  END IF;
END
$$;
