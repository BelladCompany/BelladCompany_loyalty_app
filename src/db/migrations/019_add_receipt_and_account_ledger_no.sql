-- 019: Add receipt_no and account_ledger_no to points_ledger and redemptions

ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(100);
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS account_ledger_no VARCHAR(100);

ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(100);
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS account_ledger_no VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_points_ledger_receipt_no ON points_ledger (receipt_no);
CREATE INDEX IF NOT EXISTS idx_points_ledger_account_ledger_no ON points_ledger (account_ledger_no);

-- Expand points_ledger_type_check constraint to include 'earn' and all earn subtypes
ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_type_check;

ALTER TABLE points_ledger ADD CONSTRAINT points_ledger_type_check
  CHECK (transaction_type IN ('earn', 'earn_sale', 'earn_service', 'earn_accessory', 'earn_bodyshop', 'earn_referral', 'redeem', 'adjust', 'expire', 'sale', 'service', 'referral', 'correction_applied', 'correction_reversal'));
