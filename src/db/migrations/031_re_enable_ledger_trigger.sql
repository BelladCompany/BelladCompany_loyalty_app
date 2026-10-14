-- Migration: 031_re_enable_ledger_trigger.sql
-- Role: Principal Architect
-- Purpose: Re-enables append-only ledger trigger on points_ledger and enforces security constraints (LOOP-05, LOOP-21)

-- 1. Ensure append-only trigger function exists
CREATE OR REPLACE FUNCTION prevent_points_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'points_ledger is strictly append-only. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;

-- 2. Re-enable the trigger on points_ledger
DROP TRIGGER IF EXISTS trg_prevent_points_ledger_modification ON points_ledger;
CREATE TRIGGER trg_prevent_points_ledger_modification
BEFORE UPDATE OR DELETE ON points_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_points_ledger_modification();

ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
