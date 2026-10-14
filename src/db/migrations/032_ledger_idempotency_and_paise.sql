-- Migration: 032_ledger_idempotency_and_paise.sql
-- Role: Principal Architect
-- Purpose: Adds idempotency_key, merge_id, rule_version_id, and redemption_rate_snapshot columns to points_ledger (Step 3 Refactor)

ALTER TABLE points_ledger 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
ADD COLUMN IF NOT EXISTS merge_id UUID,
ADD COLUMN IF NOT EXISTS rule_version_id UUID,
ADD COLUMN IF NOT EXISTS redemption_rate_snapshot NUMERIC(10,4) DEFAULT 0.2500;

-- Unique constraint enforcing idempotency per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency 
ON points_ledger (tenant_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Index on merge_id for tracking transfer entries
CREATE INDEX IF NOT EXISTS idx_ledger_merge_id 
ON points_ledger (tenant_id, merge_id) 
WHERE merge_id IS NOT NULL;
