-- Migration 075: Sanitize corrupted scientific notation Aadhaar numbers (ending in 000000 or 0000)
-- When historical CSV was exported, Excel converted 12-digit Aadhaar numbers to scientific notation (e.g. 2.38E+11),
-- causing them to be saved with trailing zeros (000000) and showing last 4 as '0000'.
-- This migration sanitizes those placeholder numbers to NULL so the app no longer displays fake 0000 Aadhaar,
-- allowing real 12-digit Aadhaar numbers to be populated cleanly when re-imported from Excel (.xlsx).

UPDATE customers
SET aadhaar_number = NULL,
    aadhaar_hash = NULL,
    aadhaar_last4_enc = NULL
WHERE aadhaar_number ~ '000000$' 
   OR aadhaar_number = '0000' 
   OR aadhaar_number ~ '^0+$';
