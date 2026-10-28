CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0. Ensure schema compatibility for points_ledger (entry_id vs id)
-- ============================================================================
DO $$
BEGIN
  -- 0a. Ensure entry_id column exists on points_ledger
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'entry_id'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN entry_id BIGINT;
  END IF;

  -- 0b. Ensure id column exists on points_ledger (for bidirectional compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_ledger' AND column_name = 'id'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN id BIGINT;
  END IF;

  -- 0c. Backfill values between id and entry_id if needed
  -- Temporarily disable append-only trigger if present so backfill can execute
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_prevent_points_ledger_modification' 
      AND tgrelid = 'points_ledger'::regclass
  ) THEN
    ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points_ledger' AND column_name = 'id') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points_ledger' AND column_name = 'entry_id') THEN
    UPDATE points_ledger SET entry_id = id WHERE entry_id IS NULL AND id IS NOT NULL;
    UPDATE points_ledger SET id = entry_id WHERE id IS NULL AND entry_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_prevent_points_ledger_modification' 
      AND tgrelid = 'points_ledger'::regclass
  ) THEN
    ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
  END IF;

  -- 0d. Ensure entry_id has a UNIQUE or PRIMARY KEY constraint so foreign keys can reference it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'points_ledger' 
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      AND kcu.column_name = 'entry_id'
  ) THEN
    ALTER TABLE points_ledger ADD CONSTRAINT uq_points_ledger_entry_id UNIQUE (entry_id);
  END IF;

  -- 0e. Ensure id has a UNIQUE or PRIMARY KEY constraint as well
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'points_ledger' 
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      AND kcu.column_name = 'id'
  ) THEN
    ALTER TABLE points_ledger ADD CONSTRAINT uq_points_ledger_id UNIQUE (id);
  END IF;
END $$;

-- 0f. Trigger to automatically keep id and entry_id synchronized on new inserts
CREATE OR REPLACE FUNCTION sync_points_ledger_id_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_id IS NULL AND NEW.id IS NOT NULL THEN
    NEW.entry_id := NEW.id;
  ELSIF NEW.id IS NULL AND NEW.entry_id IS NOT NULL THEN
    NEW.id := NEW.entry_id;
  ELSIF NEW.id IS NULL AND NEW.entry_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'points_ledger_id_seq') THEN
      NEW.id := nextval('points_ledger_id_seq');
      NEW.entry_id := NEW.id;
    ELSIF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'points_ledger_entry_id_seq') THEN
      NEW.entry_id := nextval('points_ledger_entry_id_seq');
      NEW.id := NEW.entry_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_points_ledger_id_columns ON points_ledger;
CREATE TRIGGER trg_sync_points_ledger_id_columns
BEFORE INSERT ON points_ledger
FOR EACH ROW
EXECUTE FUNCTION sync_points_ledger_id_columns();

-- ============================================================================
-- 1. Create customer_gifts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_gifts (
  gift_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_code             VARCHAR(32) UNIQUE NOT NULL,      -- Human-readable code e.g. "BLD-GIFT-8A2F-9D4E"
  claim_token_hash      VARCHAR(64) UNIQUE NOT NULL,      -- SHA-256 hash of URL secret claim token
  funding_source        VARCHAR(20) NOT NULL CHECK (funding_source IN ('points', 'razorpay')),
  
  -- Sender Information
  sender_customer_id    VARCHAR(32) REFERENCES customers(customer_id) ON DELETE SET NULL,
  sender_phone          VARCHAR(20) NOT NULL,
  sender_name           VARCHAR(120),
  
  -- Value & Points Conversion (4 Points = ₹1)
  amount_inr            NUMERIC(10, 2) NOT NULL,          -- Gift monetary value in Rupees
  points_equivalent     INTEGER NOT NULL,                 -- Equivalent points credited to receiver (4x amount_inr)
  points_deducted       INTEGER NOT NULL DEFAULT 0,       -- Points debited from sender (if funded by points)
  
  -- Razorpay Payment Tracking (for Mode B)
  razorpay_order_id     VARCHAR(100),
  razorpay_payment_id   VARCHAR(100),
  razorpay_signature    VARCHAR(255),
  payment_status        VARCHAR(30) NOT NULL DEFAULT 'pending' 
                        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Receiver & Claim Lifecycle Tracking
  receiver_customer_id  VARCHAR(32) REFERENCES customers(customer_id) ON DELETE SET NULL,
  receiver_phone        VARCHAR(20),
  receiver_name         VARCHAR(120),
  claim_status          VARCHAR(30) NOT NULL DEFAULT 'unclaimed' 
                        CHECK (claim_status IN ('unclaimed', 'claimed', 'rejected_existing_customer', 'expired', 'cancelled', 'refunded')),
  claimed_at            TIMESTAMPTZ,
  
  -- Expiry & Validity
  expires_at            TIMESTAMPTZ NOT NULL,             -- Link validity timestamp (e.g. 30 days)
  points_validity_days  INTEGER NOT NULL DEFAULT 365,     -- 12-month validity once claimed
  
  -- Auto-Reversion & Refund Tracking (if rejected or expired)
  reversion_status      VARCHAR(30) NOT NULL DEFAULT 'none' 
                        CHECK (reversion_status IN ('none', 'reverted_points', 'refunded_razorpay', 'pending_reversion')),
  reversion_reason      TEXT,
  reversion_tx_id       VARCHAR(100),
  reverted_at           TIMESTAMPTZ,
  
  -- Points Ledger Reference Cross-Links (primary key is entry_id)
  sender_ledger_id      BIGINT REFERENCES points_ledger(entry_id) ON DELETE SET NULL,
  receiver_ledger_id    BIGINT REFERENCES points_ledger(entry_id) ON DELETE SET NULL,
  reversion_ledger_id   BIGINT REFERENCES points_ledger(entry_id) ON DELETE SET NULL,
  
  -- Visual Theme & Message
  card_theme            VARCHAR(50) DEFAULT 'celebration',
  custom_message        TEXT,
  terms_version         VARCHAR(20) DEFAULT 'v1.0',
  tenant_id             VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_customer_gifts_claim_hash ON customer_gifts (claim_token_hash);
CREATE INDEX IF NOT EXISTS idx_customer_gifts_sender ON customer_gifts (tenant_id, sender_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_gifts_sender_phone ON customer_gifts (tenant_id, sender_phone);
CREATE INDEX IF NOT EXISTS idx_customer_gifts_receiver_phone ON customer_gifts (tenant_id, receiver_phone);
CREATE INDEX IF NOT EXISTS idx_customer_gifts_status ON customer_gifts (tenant_id, claim_status, expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_gifts_order ON customer_gifts (razorpay_order_id);

-- Audit log for gift events (creation, verification attempt, claim, rejection, reversion)
CREATE TABLE IF NOT EXISTS customer_gift_audit_logs (
  log_id                SERIAL PRIMARY KEY,
  gift_id               UUID NOT NULL REFERENCES customer_gifts(gift_id) ON DELETE CASCADE,
  event_type            VARCHAR(50) NOT NULL,
  actor_phone           VARCHAR(20),
  actor_customer_id     VARCHAR(32),
  ip_address            VARCHAR(64),
  user_agent            TEXT,
  details               JSONB,
  tenant_id             VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_audit_gift_id ON customer_gift_audit_logs (gift_id);
CREATE INDEX IF NOT EXISTS idx_gift_audit_event ON customer_gift_audit_logs (event_type, created_at);
