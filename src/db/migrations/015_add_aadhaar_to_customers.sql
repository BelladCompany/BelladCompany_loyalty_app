-- 015: Add Aadhaar fields to customers
-- ------------------------------------------------------------
-- Adds aadhaar_hash (HMAC-SHA256) and aadhaar_last4_enc (AES-256-GCM encrypted last-4) to customers table

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS aadhaar_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS aadhaar_last4_enc TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_aadhaar_hash
  ON customers (tenant_id, aadhaar_hash)
  WHERE aadhaar_hash IS NOT NULL;
