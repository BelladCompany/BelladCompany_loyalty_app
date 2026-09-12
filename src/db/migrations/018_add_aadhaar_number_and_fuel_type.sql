-- 018: Add plaintext aadhaar_number to customers and fuel_type to vehicles
-- -------------------------------------------------------------------------

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20);

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50);

-- Index for searching customers by Aadhaar number
CREATE INDEX IF NOT EXISTS idx_customers_aadhaar_number ON customers (tenant_id, aadhaar_number);
