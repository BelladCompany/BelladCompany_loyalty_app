-- Migration 050: Add pin_code to customer_gifts for unified Gift Card & Voucher claiming

ALTER TABLE customer_gifts
  ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);

-- Backfill pin_code from gift_cards if card_number matches
UPDATE customer_gifts cg
SET pin_code = gc.pin_code
FROM gift_cards gc
WHERE cg.gift_code = gc.card_number
  AND cg.pin_code IS NULL;
