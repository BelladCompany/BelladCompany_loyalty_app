-- 025: Add Tally / ERP party info and accounting fields to customers table
-- -------------------------------------------------------------------------

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS ledger_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ledger_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ledger_group VARCHAR(100),
  ADD COLUMN IF NOT EXISTS party_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gst_registration_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS vat_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pan_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS service_tax_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ecc_no VARCHAR(50);
