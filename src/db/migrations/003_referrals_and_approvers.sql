-- 1. REFERRAL_APPROVERS (Named list of authorized approvers for referral rewards)
CREATE TABLE IF NOT EXISTS referral_approvers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_referral_approvers_tenant_user UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_approvers_tenant ON referral_approvers (tenant_id);

-- 2. REFERRALS
-- Strict rules:
-- - No automatic bonus calculation
-- - Points are entered and approved manually by an authorized approver with mandatory reason
-- - Self-referrals prevented (referrer <> referred)
-- - Duplicate referrals prevented (UNIQUE tenant, referrer, referred)
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  referred_customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  points_awarded BIGINT NOT NULL DEFAULT 0,
  approval_reason TEXT,
  approved_by_approver_id INTEGER REFERENCES referral_approvers(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  tenant_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_prevent_self_referral CHECK (referrer_customer_id <> referred_customer_id),
  CONSTRAINT uq_tenant_referrer_referred UNIQUE (tenant_id, referrer_customer_id, referred_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (tenant_id, referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals (tenant_id, referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (tenant_id, status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points_ledger' AND column_name = 'transaction_type') THEN
    ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_transaction_type_check;
    ALTER TABLE points_ledger ADD CONSTRAINT points_ledger_transaction_type_check
      CHECK (transaction_type IN ('sale', 'service', 'referral', 'earn_referral', 'redemption', 'adjustment'));
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points_ledger' AND column_name = 'type') THEN
    ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_type_check;
    ALTER TABLE points_ledger ADD CONSTRAINT points_ledger_type_check
      CHECK (transaction_type IN ('sale', 'service', 'referral', 'earn_referral', 'earn_sale', 'earn_service', 'redeem', 'redemption', 'adjustment', 'earn', 'spend', 'correction_applied', 'correction_reversal'));
  END IF;
END
$$;
