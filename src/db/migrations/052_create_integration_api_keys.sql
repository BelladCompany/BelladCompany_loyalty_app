-- Migration 052: Enterprise Integration API Keys & External Systems Bridge
-- Enables secure, authenticated CRUD operations for RealBooks, DMS, AppSheet, and third-party tools.

CREATE TABLE IF NOT EXISTS integration_api_keys (
  key_id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL DEFAULT 'bellad_and_company',
  name VARCHAR(100) NOT NULL,
  client_type VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'dms', 'realbooks', 'appsheet', 'custom'
  api_key VARCHAR(120) NOT NULL UNIQUE,
  api_key_prefix VARCHAR(30) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{read,write,sync,redeem}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INT NOT NULL DEFAULT 120,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_lookup ON integration_api_keys(api_key, is_active);
CREATE INDEX IF NOT EXISTS idx_integration_api_keys_tenant ON integration_api_keys(tenant_id);

-- Seed default ready-to-use production API keys
INSERT INTO integration_api_keys (name, client_type, api_key, api_key_prefix, scopes, is_active)
VALUES
  (
    'DMS Integration Gateway (Hyundai, Maruti, Ather)',
    'dms',
    'bac_live_dms_7f8a9b0c1d2e3f4a5b6c',
    'bac_live_dms',
    '{read,write,redeem}',
    true
  ),
  (
    'RealBooks Accounting Ledger Sync',
    'realbooks',
    'bac_live_realbooks_9c8b7a6d5e4f3a2b1c',
    'bac_live_realbooks',
    '{read,sync}',
    true
  ),
  (
    'AppSheet Field Bot & Webhook Gateway',
    'appsheet',
    'bac_live_appsheet_1a2b3c4d5e6f7a8b9c',
    'bac_live_appsheet',
    '{read,write,sync}',
    true
  ),
  (
    'Master Director & Admin Integration Key',
    'custom',
    'bac_live_master_bellad_loyalty_2026',
    'bac_live_master',
    '{read,write,sync,redeem,admin}',
    true
  )
ON CONFLICT (api_key) DO UPDATE
SET is_active = true, scopes = EXCLUDED.scopes;
