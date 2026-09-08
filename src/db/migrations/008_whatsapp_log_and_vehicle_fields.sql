-- 008: WhatsApp Message Log + Vehicle Enrichment Fields

-- 1. WHATSAPP_MESSAGE_LOG
-- Immutable log of every WhatsApp dispatch attempt (OTP, points earned, redemption confirmed).
-- Allows debugging delivery failures, inspecting template usage, and auditing all sends.
CREATE TABLE IF NOT EXISTS whatsapp_message_log (
  id              BIGSERIAL PRIMARY KEY,
  customer_id     VARCHAR(32) REFERENCES customers(customer_id) ON DELETE SET NULL,
  phone_number    VARCHAR(20) NOT NULL,
  template_name   VARCHAR(100) NOT NULL,   -- e.g. 'otp_verification', 'points_earned', 'redemption_confirmed'
  message_body    TEXT,
  status          VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message   TEXT,
  provider        VARCHAR(50) DEFAULT 'mock',
  tenant_id       VARCHAR(64) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_log_customer ON whatsapp_message_log (customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_tenant_created ON whatsapp_message_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_status ON whatsapp_message_log (status);

-- 2. VEHICLE ENRICHMENT COLUMNS
-- Add purchase date, ex-showroom price (paise integer for precision), and city to vehicles table.
-- All columns are optional (nullable) because legacy vehicles may not have this data.
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS purchase_date      DATE,
  ADD COLUMN IF NOT EXISTS ex_showroom_price  BIGINT,  -- stored in paise (rupees * 100), integer precision
  ADD COLUMN IF NOT EXISTS vehicle_city       VARCHAR(100);
