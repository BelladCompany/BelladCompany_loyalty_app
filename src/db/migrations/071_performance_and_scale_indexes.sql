-- Migration 071: Enterprise Scale & Concurrency Optimization
-- Indexes for points_ledger, sale_transactions, and vehicles for 100,000+ records and sub-second analytics

CREATE INDEX IF NOT EXISTS idx_points_ledger_tenant_created 
ON points_ledger (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_points_ledger_customer_id 
ON points_ledger (customer_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_vehicle_id 
ON points_ledger (vehicle_id) WHERE vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sale_transactions_vehicle_id 
ON sale_transactions (vehicle_id) WHERE vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_points_ledger_branch_tenant 
ON points_ledger (branch_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id 
ON vehicles (customer_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_tenant_cat 
ON points_ledger (tenant_id, transaction_category);
