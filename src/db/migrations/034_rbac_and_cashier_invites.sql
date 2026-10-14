-- Migration: 034_rbac_and_cashier_invites.sql
-- Role: Principal Architect & Senior Full-Stack Engineer
-- Purpose: RBAC Roles/Permissions, Cashier Invitation Flow (tokenized link), Tenant System Settings, and User Role Schema Expansion.

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(32) PRIMARY KEY,
    role_name VARCHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Standard Hierarchical Roles
INSERT INTO roles (role_id, role_name, description) VALUES
  ('cashier', 'Cashier', 'Basic cashier with branch-scoped points earning, customer creation, and redemption request access'),
  ('branch_manager', 'Branch Manager', 'Branch operational manager with approval rights over high-value point issuances'),
  ('regional_admin', 'Regional Admin', 'Multi-branch regional manager overseeing performance and approval queues'),
  ('admin', 'Tenant Admin', 'Full tenant operational administrator'),
  ('super_admin', 'Super Admin', 'System-wide platform administrator across all tenant firms')
ON CONFLICT (role_id) DO NOTHING;

-- 2. Permissions Table & Role-Permissions Mapping
CREATE TABLE IF NOT EXISTS permissions (
    permission_id VARCHAR(64) PRIMARY KEY,
    description TEXT,
    category VARCHAR(32) NOT NULL DEFAULT 'general'
);

INSERT INTO permissions (permission_id, description, category) VALUES
  ('customers:read', 'View customer details and lookup history', 'customers'),
  ('customers:create', 'Create new customer profile', 'customers'),
  ('customers:update', 'Update customer profile', 'customers'),
  ('customers:manage', 'Delete customer or perform merge operations', 'customers'),
  ('points:create', 'Issue transaction points (sale/service)', 'points'),
  ('points:issue', 'Grant manual in-house bonus points', 'points'),
  ('redemptions:create', 'Process point redemption requests', 'redemptions'),
  ('kyc:create', 'Request customer KYC phone updates', 'kyc'),
  ('kyc:approve', 'Approve pending customer KYC change requests', 'kyc'),
  ('corrections:create', 'Raise invoice point correction requests', 'corrections'),
  ('corrections:approve', 'Approve point correction requests', 'corrections'),
  ('giftcards:issue', 'Issue Amazon-style digital gift cards', 'giftcards'),
  ('cashiers:invite', 'Generate tokenized cashier invitation links', 'admin'),
  ('rules:manage', 'Create and publish dynamic rules engine versions', 'admin')
ON CONFLICT (permission_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(32) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id VARCHAR(64) NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Seed Role Permissions Mapping
INSERT INTO role_permissions (role_id, permission_id) VALUES
  -- Cashier
  ('cashier', 'customers:read'),
  ('cashier', 'customers:create'),
  ('cashier', 'customers:update'),
  ('cashier', 'points:create'),
  ('cashier', 'points:issue'),
  ('cashier', 'redemptions:create'),
  ('cashier', 'kyc:create'),
  ('cashier', 'corrections:create'),
  -- Branch Manager
  ('branch_manager', 'customers:read'),
  ('branch_manager', 'customers:create'),
  ('branch_manager', 'customers:update'),
  ('branch_manager', 'points:create'),
  ('branch_manager', 'points:issue'),
  ('branch_manager', 'redemptions:create'),
  ('branch_manager', 'kyc:create'),
  ('branch_manager', 'corrections:create'),
  ('branch_manager', 'corrections:approve'),
  ('branch_manager', 'cashiers:invite'),
  -- Regional Admin / Admin / Super Admin (Full)
  ('admin', 'customers:read'), ('admin', 'customers:create'), ('admin', 'customers:update'), ('admin', 'customers:manage'),
  ('admin', 'points:create'), ('admin', 'points:issue'), ('admin', 'redemptions:create'),
  ('admin', 'kyc:create'), ('admin', 'kyc:approve'), ('admin', 'corrections:create'), ('admin', 'corrections:approve'),
  ('admin', 'giftcards:issue'), ('admin', 'cashiers:invite'), ('admin', 'rules:manage'),
  ('super_admin', 'customers:read'), ('super_admin', 'customers:create'), ('super_admin', 'customers:update'), ('super_admin', 'customers:manage'),
  ('super_admin', 'points:create'), ('super_admin', 'points:issue'), ('super_admin', 'redemptions:create'),
  ('super_admin', 'kyc:create'), ('super_admin', 'kyc:approve'), ('super_admin', 'corrections:create'), ('super_admin', 'corrections:approve'),
  ('super_admin', 'giftcards:issue'), ('super_admin', 'cashiers:invite'), ('super_admin', 'rules:manage')
ON CONFLICT DO NOTHING;

-- 3. Expand Users Table Role Check Constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('cashier', 'branch_manager', 'regional_admin', 'admin', 'super_admin'));

-- 4. User Invites Table (Cashier Self-Service Tokenized Invites Flow)
CREATE TABLE IF NOT EXISTS user_invites (
    invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    branch_id VARCHAR(64) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(32) NOT NULL REFERENCES roles(role_id),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_by VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_invites_tenant_token ON user_invites (tenant_id, token_hash);

-- 5. Tenant Settings Table
CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id VARCHAR(64) PRIMARY KEY REFERENCES firms(tenant_id) ON DELETE CASCADE,
    max_daily_cashier_points_limit INTEGER DEFAULT 50000,
    max_per_tx_cashier_points_limit INTEGER DEFAULT 10000,
    high_value_issuance_threshold INTEGER DEFAULT 10000,
    require_manager_approval_above INTEGER DEFAULT 10000,
    enable_2fa BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Tenant Settings for Default Tenants
INSERT INTO tenant_settings (tenant_id, max_daily_cashier_points_limit, max_per_tx_cashier_points_limit)
VALUES 
  ('bellad_and_company', 50000, 10000),
  ('BAC-MAIN', 50000, 10000),
  ('trident_automobiles', 50000, 10000),
  ('advaith_motors', 50000, 10000)
ON CONFLICT (tenant_id) DO NOTHING;
