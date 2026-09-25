-- 029_gift_cards_firms_and_scalability.sql
-- Multi-Tenant Firm Management, Amazon-Style Gift Cards & Scalability Indexing

-- ─── 1. FIRMS / TENANTS TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS firms (
  firm_id             SERIAL PRIMARY KEY,
  tenant_id           VARCHAR(64) UNIQUE NOT NULL,
  firm_name           VARCHAR(255) NOT NULL,
  legal_name          VARCHAR(255),
  brand_slug          VARCHAR(64),
  logo_url            VARCHAR(500),
  theme_color         VARCHAR(32) DEFAULT '#0f172a',
  accent_color        VARCHAR(32) DEFAULT '#2563eb',
  point_to_rupee_rate NUMERIC(10, 4) DEFAULT 0.25, -- 4 points = 1 Rupee (0.25)
  contact_phone       CITEXT,
  contact_email       CITEXT,
  address             TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firms_tenant ON firms (tenant_id);
CREATE INDEX IF NOT EXISTS idx_firms_active ON firms (is_active);

-- Seed Default Multi-Tenant Firms (Bellad, Trident, Advaith)
INSERT INTO firms (tenant_id, firm_name, legal_name, brand_slug, theme_color, accent_color, point_to_rupee_rate, contact_email)
VALUES
  ('bellad_and_company', 'Bellad & Company', 'Bellad Automobile Corporation Pvt Ltd', 'bellad', '#0f172a', '#f97316', 0.25, 'support@bellad.co.in'),
  ('BAC-MAIN', 'Bellad Main Hub', 'Bellad Auto Group Main Hub', 'bellad-main', '#0f172a', '#f97316', 0.25, 'admin@bellad.co.in'),
  ('trident_automobiles', 'Trident Automobiles', 'Trident Hyundai & Automobiles Ltd', 'trident', '#0b192c', '#008dda', 0.25, 'loyalty@tridentauto.in'),
  ('advaith_motors', 'Advaith Motors', 'Advaith Hyundai Dealer Group Pvt Ltd', 'advaith', '#1e201e', '#3b82f6', 0.25, 'rewards@advaithmotors.com')
ON CONFLICT (tenant_id) DO UPDATE
SET firm_name = EXCLUDED.firm_name,
    legal_name = EXCLUDED.legal_name,
    theme_color = EXCLUDED.theme_color,
    accent_color = EXCLUDED.accent_color,
    updated_at = NOW();


-- ─── 2. GIFT CARDS TABLE (AMAZON-STYLE DIGITAL GIFT CARDS) ───────────────────
CREATE TABLE IF NOT EXISTS gift_cards (
  card_id               SERIAL PRIMARY KEY,
  card_number           VARCHAR(32) UNIQUE NOT NULL, -- e.g. "GIFT-BELL-8291-9402"
  pin_code              VARCHAR(16) NOT NULL,        -- 4-6 digit claim security PIN
  initial_amount_paise  BIGINT NOT NULL,             -- Stored in paise (e.g. 100000 = ₹1,000)
  balance_amount_paise  BIGINT NOT NULL,             -- Current remaining balance
  currency              VARCHAR(10) NOT NULL DEFAULT 'INR',
  sender_name           VARCHAR(120),
  sender_email          VARCHAR(120),
  sender_phone          VARCHAR(30),
  recipient_name        VARCHAR(120),
  recipient_phone       CITEXT,
  recipient_email       CITEXT,
  assigned_customer_id  VARCHAR(32) REFERENCES customers(customer_id) ON DELETE SET NULL,
  custom_message        TEXT,
  card_theme            VARCHAR(50) DEFAULT 'celebration', -- celebration, festive, premium, birthday, automotive
  status                VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_redeemed', 'redeemed', 'expired', 'locked', 'cancelled')),
  expires_at            TIMESTAMPTZ NOT NULL,
  tenant_id             VARCHAR(64) NOT NULL,
  created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant_status ON gift_cards (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_number ON gift_cards (tenant_id, card_number);
CREATE INDEX IF NOT EXISTS idx_gift_cards_assigned_cust ON gift_cards (tenant_id, assigned_customer_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_phone ON gift_cards (tenant_id, recipient_phone);


-- ─── 3. GIFT CARD REDEMPTIONS / CLAIMS AUDIT LEDGER ──────────────────────────
CREATE TABLE IF NOT EXISTS gift_card_redemptions (
  redemption_id         SERIAL PRIMARY KEY,
  card_id               INTEGER NOT NULL REFERENCES gift_cards(card_id) ON DELETE CASCADE,
  customer_id           VARCHAR(32) REFERENCES customers(customer_id) ON DELETE SET NULL,
  amount_paise          BIGINT NOT NULL,
  balance_before_paise  BIGINT NOT NULL,
  balance_after_paise   BIGINT NOT NULL,
  transaction_type      VARCHAR(40) NOT NULL DEFAULT 'wallet_claim' CHECK (transaction_type IN ('wallet_claim', 'pos_redemption', 'service_billing', 'points_conversion', 'manual_adjustment')),
  points_credited       INTEGER DEFAULT 0,
  reference_id          VARCHAR(100),
  cashier_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes                 TEXT,
  tenant_id             VARCHAR(64) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_card ON gift_card_redemptions (tenant_id, card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_cust ON gift_card_redemptions (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_date ON gift_card_redemptions (tenant_id, created_at);


-- ─── 4. HIGH-SCALE INDEXES (> 100,000 CUSTOMERS / TRANSACTIONS) ──────────────
CREATE INDEX IF NOT EXISTS idx_customers_tenant_aadhaar ON customers (tenant_id, aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_aadhaar_hash ON customers (tenant_id, aadhaar_hash);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_name_trgm ON customers USING gin (customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customer_phones_tenant_num ON customer_phones (tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_reg ON vehicles (tenant_id, registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_chassis ON vehicles (tenant_id, chassis_no);
CREATE INDEX IF NOT EXISTS idx_points_ledger_tenant_cust_date ON points_ledger (tenant_id, customer_id, created_at DESC);
