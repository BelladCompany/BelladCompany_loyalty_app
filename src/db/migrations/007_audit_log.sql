-- Migration 007: Create audit_log table for tracking points adjustments, merges, and redemptions

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,            -- e.g., 'points_earn_sale', 'points_earn_service', 'points_earn_referral', 'points_adjustment', 'customer_merge', 'points_redemption'
  entity_type VARCHAR(50) NOT NULL,         -- e.g., 'customer', 'points_ledger', 'redemption', 'merge'
  entity_id VARCHAR(100) NOT NULL,          -- e.g., customer_id or redemption_id
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- User who initiated the action (null if system)
  before_values JSONB,                      -- State/balance snapshot before action
  after_values JSONB,                       -- State/balance snapshot after action
  metadata JSONB,                           -- Extra context (reason, reference_id, branch_id, discount, etc.)
  tenant_id VARCHAR(50) NOT NULL DEFAULT 'BAC-MAIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_user ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
