-- 013: Expand points_ledger_transaction_category_check constraint
-- Allows 'redemption', 'expiry', 'referral', and 'adjust' in transaction_category column.

ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_transaction_category_check;

ALTER TABLE points_ledger ADD CONSTRAINT points_ledger_transaction_category_check
CHECK (transaction_category IN ('service', 'sale', 'accessory', 'bodyshop', 'referral', 'redemption', 'expiry', 'adjust'));
