-- 017: Add missing VIN order form fields to customers and vehicles tables
-- -------------------------------------------------------------------------

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS branch_address TEXT,
  ADD COLUMN IF NOT EXISTS dms_invoice_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dms_invoice_date VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sales_consultant VARCHAR(100);

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS branch_address TEXT,
  ADD COLUMN IF NOT EXISTS dms_invoice_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dms_invoice_date VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sales_consultant VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vin VARCHAR(64);

-- Indexes for lightning fast unified search
CREATE INDEX IF NOT EXISTS idx_customers_firm_trgm ON customers USING gin (firm_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_variant_trgm ON vehicles USING gin (variant gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_trgm ON vehicles USING gin (brand_name gin_trgm_ops);
