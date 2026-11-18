-- Migration 066: High-Speed Query Optimization Indexes
-- Enhances database performance for dashboard queries, ledger searches, and balance lookups
-- Ensures sub-10ms response times for Director, Cashier, and Customer passes

CREATE INDEX IF NOT EXISTS idx_points_ledger_tenant_cat_created 
ON points_ledger (tenant_id, transaction_category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_points_ledger_cust_tenant 
ON points_ledger (customer_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_branch 
ON points_ledger (branch_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_receipt 
ON points_ledger (receipt_no, tenant_id);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_created 
ON customers (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_phones_cust 
ON customer_phones (customer_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_cust_tenant 
ON vehicles (customer_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_customer_tier_snapshot_cust 
ON customer_tier_snapshot (customer_id, tenant_id);

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
