-- Migration 027: Create google_sheets_sync_log table for Google Sheets auto-sync
CREATE TABLE IF NOT EXISTS google_sheets_sync_log (
  id SERIAL PRIMARY KEY,
  sheet_id VARCHAR(100) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  phone_number VARCHAR(50),
  aadhaar_number VARCHAR(50),
  source VARCHAR(100) DEFAULT 'portal_enrollment',
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  tenant_id VARCHAR(50) DEFAULT 'bellad_and_company',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_cust ON google_sheets_sync_log (customer_id);
CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_created ON google_sheets_sync_log (created_at DESC);
