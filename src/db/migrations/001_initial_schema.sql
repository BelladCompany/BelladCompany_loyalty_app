-- Enable pg_trgm extension for fuzzy name searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Sequence for customer_id format BAC-100001 (incrementing)
CREATE SEQUENCE IF NOT EXISTS customer_id_seq START WITH 100001;

-- 1. BRANDS
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_brands_tenant_code UNIQUE (tenant_id, code)
);

-- 2. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_branches_tenant_code UNIQUE (tenant_id, code)
);

-- 3. USERS (Roles: cashier, admin)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('cashier', 'admin')),
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_tenant_username UNIQUE (tenant_id, username)
);

-- 4. CUSTOMERS
-- Customer ID is system-generated (format BAC-100001), immutable, and NEVER derived from phone or name.
CREATE TABLE IF NOT EXISTS customers (
  customer_id VARCHAR(32) PRIMARY KEY DEFAULT ('BAC-' || nextval('customer_id_seq')::text),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigram GIN index for fast fuzzy searching by customer name
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers (tenant_id);

-- 5. CUSTOMER_PHONES
-- Multiple phone numbers can be linked to a single customer_id
CREATE TABLE IF NOT EXISTS customer_phones (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_phones_tenant_phone UNIQUE (tenant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_customer_phones_lookup ON customer_phones (tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_customer_phones_customer_id ON customer_phones (customer_id);

-- 6. VEHICLES
-- Multiple vehicles across multiple brands/branches linked to customer_id
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  vin VARCHAR(64),
  registration_number VARCHAR(32) NOT NULL,
  model VARCHAR(100),
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vehicles_tenant_reg UNIQUE (tenant_id, registration_number)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles (customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg_lookup ON vehicles (tenant_id, registration_number);

-- 7. TIER_RULES
CREATE TABLE IF NOT EXISTS tier_rules (
  id SERIAL PRIMARY KEY,
  tier_name VARCHAR(50) NOT NULL,
  min_points BIGINT NOT NULL DEFAULT 0,
  multiplier INTEGER NOT NULL DEFAULT 100, -- e.g. 100 = 1.0x, 125 = 1.25x in integer basis
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tier_rules_tenant_tier UNIQUE (tenant_id, tier_name)
);

-- 8. POINTS_LEDGER (Append-only, no updates or deletes)
CREATE TABLE IF NOT EXISTS points_ledger (
  id BIGSERIAL PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id),
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  transaction_type VARCHAR(32) NOT NULL CHECK (transaction_type IN ('sale', 'service', 'referral', 'redemption', 'adjustment')),
  points BIGINT NOT NULL, -- Integer points math (never floating point)
  amount_paise BIGINT NOT NULL DEFAULT 0, -- Monetary base in paise (never float)
  reason TEXT,
  reference_id VARCHAR(100),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_customer ON points_ledger (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_created_at ON points_ledger (created_at);

-- Trigger to prevent UPDATE or DELETE on points_ledger (ensuring strict append-only integrity)
CREATE OR REPLACE FUNCTION prevent_points_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'points_ledger is strictly append-only. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_points_ledger_modification ON points_ledger;
CREATE TRIGGER trg_prevent_points_ledger_modification
BEFORE UPDATE OR DELETE ON points_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_points_ledger_modification();
