-- 021: Add age column to customers table
-- -------------------------------------

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS age INT;
