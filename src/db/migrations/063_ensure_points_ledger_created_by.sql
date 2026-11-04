-- Migration 063: Ensure points_ledger has created_by and cashier_id columns
-- Harmonizes column names between local and cloud database instances

ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS cashier_id INTEGER;
