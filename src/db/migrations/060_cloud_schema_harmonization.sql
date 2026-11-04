-- Migration 060: Cloud Schema Harmonization
-- Ensures all columns required by referral, vehicle, phone, and points queries exist across environments.

DO $$
BEGIN
  -- 1. referral_approvers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_approvers') THEN
    ALTER TABLE referral_approvers ADD COLUMN IF NOT EXISTS approver_id INTEGER;
    ALTER TABLE referral_approvers ADD COLUMN IF NOT EXISTS id INTEGER;
    ALTER TABLE referral_approvers ALTER COLUMN user_id DROP NOT NULL;
    
    UPDATE referral_approvers SET approver_id = id WHERE approver_id IS NULL AND id IS NOT NULL;
    UPDATE referral_approvers SET id = approver_id WHERE id IS NULL AND approver_id IS NOT NULL;
  END IF;

  -- 2. vehicles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS branch_id INTEGER;
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS exshowroom_price NUMERIC;
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_id INTEGER;
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS id INTEGER;
    ALTER TABLE vehicles ALTER COLUMN chassis_no DROP NOT NULL;
    ALTER TABLE vehicles ALTER COLUMN model DROP NOT NULL;

    UPDATE vehicles SET vehicle_id = id WHERE vehicle_id IS NULL AND id IS NOT NULL;
    UPDATE vehicles SET id = vehicle_id WHERE id IS NULL AND vehicle_id IS NOT NULL;
  END IF;

  -- 3. customer_phones
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_phones') THEN
    ALTER TABLE customer_phones ADD COLUMN IF NOT EXISTS phone_id INTEGER;
    ALTER TABLE customer_phones ADD COLUMN IF NOT EXISTS id INTEGER;
    UPDATE customer_phones SET phone_id = id WHERE phone_id IS NULL AND id IS NOT NULL;
    UPDATE customer_phones SET id = phone_id WHERE id IS NULL AND phone_id IS NOT NULL;
  END IF;

  -- 4. points_ledger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'points_ledger') THEN
    ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS entry_id BIGINT;
    ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS id BIGINT;
    ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS cashier_id INTEGER;
    ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS created_by INTEGER;
    ALTER TABLE points_ledger ALTER COLUMN type DROP NOT NULL;
    ALTER TABLE points_ledger ALTER COLUMN points DROP NOT NULL;
    UPDATE points_ledger SET entry_id = id WHERE entry_id IS NULL AND id IS NOT NULL;
    UPDATE points_ledger SET id = entry_id WHERE id IS NULL AND entry_id IS NOT NULL;
    UPDATE points_ledger SET cashier_id = created_by WHERE cashier_id IS NULL AND created_by IS NOT NULL;
    UPDATE points_ledger SET created_by = cashier_id WHERE created_by IS NULL AND cashier_id IS NOT NULL;

    -- Harmonize sync trigger for cashier_id/created_by and type/transaction_type
    CREATE OR REPLACE FUNCTION public.sync_points_ledger_id_columns()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      IF NEW.entry_id IS NULL AND NEW.id IS NOT NULL THEN
        NEW.entry_id := NEW.id;
      ELSIF NEW.id IS NULL AND NEW.entry_id IS NOT NULL THEN
        NEW.id := NEW.entry_id;
      END IF;

      IF NEW.cashier_id IS NULL AND NEW.created_by IS NOT NULL THEN
        NEW.cashier_id := NEW.created_by;
      ELSIF NEW.created_by IS NULL AND NEW.cashier_id IS NOT NULL THEN
        NEW.created_by := NEW.cashier_id;
      END IF;

      IF NEW.type IS NULL AND NEW.transaction_type IS NOT NULL THEN
        NEW.type := NEW.transaction_type;
      ELSIF NEW.transaction_type IS NULL AND NEW.type IS NOT NULL THEN
        NEW.transaction_type := NEW.type;
      END IF;

      RETURN NEW;
    END;
    $function$;
  END IF;

  -- 5. customer_tier_snapshot
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS tier_name VARCHAR(50);
    ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS current_tier VARCHAR(50);
    ALTER TABLE customer_tier_snapshot ALTER COLUMN tier_name DROP NOT NULL;
    ALTER TABLE customer_tier_snapshot ALTER COLUMN current_tier DROP NOT NULL;
    UPDATE customer_tier_snapshot SET tier_name = current_tier WHERE tier_name IS NULL AND current_tier IS NOT NULL;
    UPDATE customer_tier_snapshot SET current_tier = tier_name WHERE current_tier IS NULL AND tier_name IS NOT NULL;
  END IF;

  -- 6. Seed default referral approvers if table is empty
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_approvers') THEN
    IF NOT EXISTS (SELECT 1 FROM referral_approvers WHERE tenant_id = 'bellad_and_company') THEN
      INSERT INTO referral_approvers (approver_id, name, is_active, tenant_id)
      VALUES 
        (1, 'Umesh', true, 'bellad_and_company'),
        (2, 'Shrinivas', true, 'bellad_and_company'),
        (3, 'Shivanand', true, 'bellad_and_company'),
        (4, 'Admin Approver', true, 'bellad_and_company')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 7. otp_requests harmonization
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'otp_requests') THEN
    ALTER TABLE otp_requests ADD COLUMN IF NOT EXISTS otp_id INTEGER;
    ALTER TABLE otp_requests ADD COLUMN IF NOT EXISTS purpose VARCHAR(100);
    ALTER TABLE otp_requests ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
    UPDATE otp_requests SET otp_id = id WHERE otp_id IS NULL AND id IS NOT NULL;
    UPDATE otp_requests SET id = otp_id WHERE id IS NULL AND otp_id IS NOT NULL;

    CREATE OR REPLACE FUNCTION sync_otp_requests_id_columns()
    RETURNS TRIGGER AS $trig$
    BEGIN
      IF NEW.otp_id IS NULL AND NEW.id IS NOT NULL THEN
        NEW.otp_id := NEW.id;
      ELSIF NEW.id IS NULL AND NEW.otp_id IS NOT NULL THEN
        NEW.id := NEW.otp_id;
      END IF;
      RETURN NEW;
    END;
    $trig$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_otp_requests_id_columns ON otp_requests;
    CREATE TRIGGER trg_sync_otp_requests_id_columns
      BEFORE INSERT OR UPDATE ON otp_requests
      FOR EACH ROW
      EXECUTE FUNCTION sync_otp_requests_id_columns();
  END IF;
END $$;

