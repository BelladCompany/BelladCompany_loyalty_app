-- 016: AppSheet Pull Log and Extended Customer/Vehicle Fields Migration
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS appsheet_pull_log (
  log_id       SERIAL PRIMARY KEY,
  table_name   VARCHAR(100) NOT NULL,
  rows_fetched INT DEFAULT 0,
  rows_synced  INT DEFAULT 0,
  rows_skipped INT DEFAULT 0,
  rows_errored INT DEFAULT 0,
  details      JSONB,
  tenant_id    VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appsheet_pull_log_created ON appsheet_pull_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appsheet_pull_log_table ON appsheet_pull_log (table_name);

-- Add extended customer profile fields from AppSheet booking & order forms
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nominee_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nominee_relation VARCHAR(50),
  ADD COLUMN IF NOT EXISTS firm_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email VARCHAR(100);

-- Add extended vehicle fields from AppSheet
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS variant VARCHAR(100),
  ADD COLUMN IF NOT EXISTS brand_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS firm_name VARCHAR(100);
