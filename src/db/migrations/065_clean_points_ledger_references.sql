-- Migration 065: Clean points ledger reference formatting and prevent master rule pollution
-- Ensures source_ref contains only clean Receipt No and Type (e.g. 'Rec-05 | Service')
-- Strips verbose internal engine strings like 'Master Rule: ...' from reference details.

-- Temporarily bypass immutability trigger for admin formatting sanitization
ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;

-- 1. Specifically clean up Rec-05 test row
UPDATE points_ledger
SET source_ref = 'Rec-05 | Service',
    transaction_category = 'service',
    receipt_no = 'Rec-05'
WHERE (source_ref LIKE '%Rec-05%' OR receipt_no = 'Rec-05');

-- 2. Strip ' | Master Rule: ...' from any existing points_ledger records
UPDATE points_ledger
SET source_ref = REGEXP_REPLACE(source_ref, ' \| Master Rule:.*$', '')
WHERE source_ref LIKE '%Master Rule%';

-- Re-enable immutability trigger
ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;

-- 3. Ensure GOOGLE-RATING-BOOST is isolated to google_rating scheme only
UPDATE master_loyalty_rules
SET scheme_type = 'google_rating'
WHERE rule_code = 'GOOGLE-RATING-BOOST';
