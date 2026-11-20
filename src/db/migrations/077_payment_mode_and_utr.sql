-- 077_payment_mode_and_utr.sql
-- Add payment_mode and utr_number support to points_ledger and redemptions

ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(32);
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100);

ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(32);
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100);
