-- 056_referral_code_and_whatsapp_tracking.sql
-- Add unique referral codes (no PIN), WhatsApp share tracking, dual-party reward crediting, and harmonize referral_id / id primary keys

DO $$
BEGIN
  -- 0. Ensure referral_id column exists (if table was created with 'id', rename to referral_id or add it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'referral_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'referrals' AND column_name = 'id'
    ) THEN
      ALTER TABLE referrals RENAME COLUMN id TO referral_id;
    ELSE
      ALTER TABLE referrals ADD COLUMN referral_id SERIAL PRIMARY KEY;
    END IF;
  END IF;

  -- 1. Ensure id column exists for backwards-compatibility with any queries selecting 'id'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'id'
  ) THEN
    ALTER TABLE referrals ADD COLUMN id INTEGER;
    UPDATE referrals SET id = referral_id WHERE id IS NULL;
  END IF;

  -- 2. Ensure referred_customer_id is nullable so referral codes can be generated and shared before referee registration
  ALTER TABLE referrals ALTER COLUMN referred_customer_id DROP NOT NULL;

  -- 3. Add all operational referral columns if not exists
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_code VARCHAR(32);
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS share_channel VARCHAR(30) DEFAULT 'whatsapp';
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_name VARCHAR(120);
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_phone VARCHAR(30);
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS points_credited BIGINT DEFAULT 0;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS suggested_points BIGINT DEFAULT 0;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS points_awarded BIGINT DEFAULT 0;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reason TEXT;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS approval_reason TEXT;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS approved_by INTEGER;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS approved_by_approver_id INTEGER;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_points_awarded BIGINT DEFAULT 2500;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_points_awarded BIGINT DEFAULT 2500;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_points_credited BIGINT DEFAULT 0;

  -- 4. Backfill existing referrals with branded referral codes: REF-BELL-XXXX-XXXX
  UPDATE referrals
  SET 
    referral_code = 'REF-BELL-' || LPAD(referral_id::text, 4, '0') || '-' || UPPER(SUBSTRING(MD5(referral_id::text || COALESCE(tenant_id, 'bellad')) FROM 1 FOR 4)),
    shared_at = COALESCE(shared_at, created_at, NOW()),
    share_channel = COALESCE(share_channel, 'whatsapp'),
    referrer_points_awarded = COALESCE(NULLIF(points_awarded, 0), NULLIF(suggested_points, 0), NULLIF(points_credited, 0), 2500),
    referee_points_awarded = COALESCE(NULLIF(points_awarded, 0), NULLIF(suggested_points, 0), NULLIF(points_credited, 0), 2500),
    referee_points_credited = COALESCE(points_credited, 0),
    id = referral_id
  WHERE referral_code IS NULL;

  -- 5. Ensure referral_code has a unique constraint per tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_referrals_referral_code'
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT uq_referrals_referral_code UNIQUE (referral_code);
  END IF;

  -- 6. Check constraint update for status to include 'shared'
  ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
  ALTER TABLE referrals ADD CONSTRAINT referrals_status_check 
    CHECK (status IN ('shared', 'pending', 'approved', 'rejected', 'claimed'));

  -- 7. Ensure id and referral_id stay in sync via trigger
  CREATE OR REPLACE FUNCTION sync_referrals_id_columns()
  RETURNS TRIGGER AS $trig$
  BEGIN
    IF NEW.referral_id IS NULL AND NEW.id IS NOT NULL THEN
      NEW.referral_id := NEW.id;
    ELSIF NEW.id IS NULL AND NEW.referral_id IS NOT NULL THEN
      NEW.id := NEW.referral_id;
    END IF;
    RETURN NEW;
  END;
  $trig$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_sync_referrals_id ON referrals;
  CREATE TRIGGER trg_sync_referrals_id
    BEFORE INSERT OR UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION sync_referrals_id_columns();

END $$;
