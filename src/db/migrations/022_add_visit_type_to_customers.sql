-- 022: Add address, visit_type, and is_first_time_visitor to customers table
-- --------------------------------------------------------------------------

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS visit_type VARCHAR(50) DEFAULT 'first_time',
  ADD COLUMN IF NOT EXISTS is_first_time_visitor BOOLEAN DEFAULT TRUE;
