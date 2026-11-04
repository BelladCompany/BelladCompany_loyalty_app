-- 056_referral_code_and_whatsapp_tracking.sql
-- Add unique referral codes (no PIN), WhatsApp share tracking, and dual-party reward crediting to referrals table

DO $$
BEGIN
  -- 1. Ensure referred_customer_id is nullable so referral codes can be generated and shared via WhatsApp before referee registration
  ALTER TABLE referrals ALTER COLUMN referred_customer_id DROP NOT NULL;

  -- 2. Add referral_code column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE referrals ADD COLUMN referral_code VARCHAR(32);
  END IF;

  -- 3. Add share_channel column ('whatsapp', 'sms', 'direct_link')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'share_channel'
  ) THEN
    ALTER TABLE referrals ADD COLUMN share_channel VARCHAR(30) DEFAULT 'whatsapp';
  END IF;

  -- 4. Add shared_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'shared_at'
  ) THEN
    ALTER TABLE referrals ADD COLUMN shared_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- 5. Add recipient/referee details (name & phone)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'referee_name'
  ) THEN
    ALTER TABLE referrals ADD COLUMN referee_name VARCHAR(120);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'referee_phone'
  ) THEN
    ALTER TABLE referrals ADD COLUMN referee_phone VARCHAR(30);
  END IF;

  -- 6. Add dual points columns for both Referrer and Referee
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'referrer_points_awarded'
  ) THEN
    ALTER TABLE referrals ADD COLUMN referrer_points_awarded BIGINT DEFAULT 2500;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'referee_points_awarded'
  ) THEN
    ALTER TABLE referrals ADD COLUMN referee_points_awarded BIGINT DEFAULT 2500;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'referee_points_credited'
  ) THEN
    ALTER TABLE referrals ADD COLUMN referee_points_credited BIGINT DEFAULT 0;
  END IF;

  -- 7. Backfill existing referrals with branded referral codes: REF-BELL-XXXX-XXXX
  UPDATE referrals
  SET 
    referral_code = 'REF-BELL-' || LPAD(referral_id::text, 4, '0') || '-' || UPPER(SUBSTRING(MD5(referral_id::text || COALESCE(tenant_id, 'bellad')) FROM 1 FOR 4)),
    shared_at = COALESCE(shared_at, created_at, NOW()),
    share_channel = COALESCE(share_channel, 'whatsapp'),
    referrer_points_awarded = COALESCE(NULLIF(points_awarded, 0), NULLIF(suggested_points, 0), NULLIF(points_credited, 0), 2500),
    referee_points_awarded = COALESCE(NULLIF(points_awarded, 0), NULLIF(suggested_points, 0), NULLIF(points_credited, 0), 2500),
    referee_points_credited = COALESCE(points_credited, 0)
  WHERE referral_code IS NULL;

  -- 8. Ensure referral_code has a unique constraint per tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_referrals_referral_code'
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT uq_referrals_referral_code UNIQUE (referral_code);
  END IF;

  -- 9. Check constraint update for status to include 'shared'
  ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
  ALTER TABLE referrals ADD CONSTRAINT referrals_status_check 
    CHECK (status IN ('shared', 'pending', 'approved', 'rejected', 'claimed'));

END $$;
