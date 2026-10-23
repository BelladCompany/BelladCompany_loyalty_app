-- 043_customer_gifting_system.sql
-- Customer-to-Customer Gifting Engine via WhatsApp Link (Points or Razorpay)
-- Strict single-use claim, "New Customers Only" enforcement, auto-reversion, and DPDP compliance.

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
