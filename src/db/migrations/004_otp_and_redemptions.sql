-- 1. OTP_REQUESTS
-- Rate-limited to 5 requests/hour/customer, 10-minute expiry, single-use, hashed OTP code
CREATE TABLE IF NOT EXISTS otp_requests (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_requests_rate_limit ON otp_requests (tenant_id, customer_id, created_at);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_requests' AND column_name = 'is_used') THEN
    CREATE INDEX IF NOT EXISTS idx_otp_requests_validation ON otp_requests (tenant_id, customer_id, is_used, expires_at);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_requests' AND column_name = 'is_verified') THEN
    CREATE INDEX IF NOT EXISTS idx_otp_requests_validation ON otp_requests (tenant_id, customer_id, is_verified, expires_at);
  END IF;
END
$$;

-- 2. REDEMPTIONS
-- Stores completed redemptions, discount amounts, and unique redemption codes
CREATE TABLE IF NOT EXISTS redemptions (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  redemption_code VARCHAR(64) NOT NULL,
  points_redeemed BIGINT NOT NULL,
  discount_amount_rupees BIGINT NOT NULL, -- Integer math: points / 4 (4 points = 1 rupee)
  discount_amount_paise BIGINT NOT NULL,  -- Integer math: (points * 100) / 4
  otp_request_id INTEGER REFERENCES otp_requests(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_redemptions_tenant_code UNIQUE (tenant_id, redemption_code)
);

CREATE INDEX IF NOT EXISTS idx_redemptions_customer ON redemptions (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_created_at ON redemptions (created_at);
