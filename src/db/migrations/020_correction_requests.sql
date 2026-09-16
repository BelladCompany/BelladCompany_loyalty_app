-- 020: Ticket-Based Transaction Correction Requests Table and Ledger Types

-- 1. Create correction_requests table
CREATE TABLE IF NOT EXISTS correction_requests (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL REFERENCES customers(customer_id),
  points_ledger_reference VARCHAR(100) NOT NULL,
  cashier_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  wrong_bill_amount NUMERIC(12, 2) NOT NULL,
  correct_bill_amount NUMERIC(12, 2) NOT NULL,
  explanation TEXT NOT NULL,
  screenshot_file_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_correction_requests_tenant_status ON correction_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_correction_requests_ref ON correction_requests (points_ledger_reference);
CREATE INDEX IF NOT EXISTS idx_correction_requests_cashier ON correction_requests (cashier_user_id);
CREATE INDEX IF NOT EXISTS idx_correction_requests_created_at ON correction_requests (created_at);

-- 2. Expand points_ledger_type_check constraint to include correction_reversal and correction_applied
ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_type_check;

ALTER TABLE points_ledger ADD CONSTRAINT points_ledger_type_check
  CHECK (transaction_type IN ('earn', 'earn_sale', 'earn_service', 'earn_accessory', 'earn_bodyshop', 'earn_referral', 'redeem', 'adjust', 'expire', 'sale', 'service', 'referral', 'correction_reversal', 'correction_applied'));
