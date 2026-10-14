# MULTI-TENANT SAAS ARCHITECTURE & IMPLEMENTATION SPECIFICATION (PHASE 1 - REVISED)
**Automobile Dealership Group Loyalty Program Platform**  
**Role:** Principal Software Architect, Senior Full-Stack Engineer, QA Lead  
**Specification Date:** September 2026  
**Status:** Read-Only Architecture Plan Complete — Ready for Review & Final Approval (No Production Code Modified)

---

## 1. Complete Schema Changes & Migration Strategy (Fixing B1, B2, B3, B4, B7, B8)

All database modifications are strictly backward-compatible, append-only, and fully reversible via down-migrations.

### 1.1 Complete Rule Categories & Constant Mapping Table (Fixing B1)

Below is the mapping of every existing point rule constant to its corresponding `rule_sets.category` and configuration key:

| Legacy Rule Constant / Category | Current Value | Target `rule_sets.category` | Config Key |
| :--- | :--- | :--- | :--- |
| **Sale Earning Rate** | 1% (1 pt per ₹100) | `sale` | `rule_versions.earning_ratio_num`, `earning_ratio_den` |
| **Service Earning Rate** | 4% (4 pts per ₹100) | `service` | `rule_versions.earning_ratio_num`, `earning_ratio_den` |
| **Accessory Earning Rate** | 2% (2 pts per ₹100) | `accessory` | `rule_versions.earning_ratio_num`, `earning_ratio_den` |
| **Bodyshop Earning Rate** | 3% (3 pts per ₹100) | `bodyshop` | `rule_versions.earning_ratio_num`, `earning_ratio_den` |
| **In-House Bonus Slabs** | Finance=100, Ins=50, Exch=200 | `inhouse_bonus` | `rule_versions.inhouse_bonus_slabs` |
| **Referral Slabs (2W / 4W)** | Dynamic 4W/2W Slabs | `referral` | `rule_versions.referral_slabs` |
| **Redemption Rate** | 4 pts = ₹1 (0.25) | `redemption` | `rule_versions.redemption_rate_rupees_per_point` |

### 1.2 Comprehensive Schema SQL Definition (Fixing B2, B3, B4, B7, B8)

```sql
-- Migration: 030_saas_multi_tenancy_and_rules.sql

-- 1. Master Roles & Permissions Catalog (B8)
CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (role_id, name, description) VALUES
  ('super_admin', 'Super Admin', 'Pan-India platform controller'),
  ('tenant_admin', 'Tenant Admin', 'Dealership group operational administrator'),
  ('branch_manager', 'Branch Manager', 'Branch supervisor and high-value approver'),
  ('cashier', 'Counter Cashier', 'Point-of-sale customer service representative')
ON CONFLICT (role_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS permissions (
    permission_id VARCHAR(64) PRIMARY KEY,
    module VARCHAR(32) NOT NULL, -- customers, points, redemptions, vehicles, reports, kyc, corrections, rules, control_center, giftcards, tenants, billing
    action VARCHAR(32) NOT NULL, -- read, create, update, approve, issue, reverse, override, export, manage
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(64) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    permission_id VARCHAR(64) NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, tenant_id, permission_id)
);

-- User Roles & Branch Scoping Assignment Table (B8)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    role_id VARCHAR(64) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    assigned_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id, role_id)
);

-- Sessions & Refresh Tokens for Revocation (B8)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Master Data Catalogs (B8)
CREATE TABLE IF NOT EXISTS master_brands (
    brand_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    brand_slug VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_models (
    model_id VARCHAR(64) PRIMARY KEY,
    brand_id VARCHAR(64) NOT NULL REFERENCES master_brands(brand_id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    vehicle_type VARCHAR(32) NOT NULL CHECK (vehicle_type IN ('2W', '4W')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scoped Feature Flags Table (B8)
CREATE TABLE IF NOT EXISTS feature_flags (
    flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    flag_key VARCHAR(64) NOT NULL,
    scope_type VARCHAR(32) NOT NULL CHECK (scope_type IN ('tenant', 'role', 'branch', 'user')),
    scope_value VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    config_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, flag_key, scope_type, scope_value)
);

-- 4. Custom Field Definitions Table (B8)
CREATE TABLE IF NOT EXISTS field_definitions (
    field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    entity_name VARCHAR(32) NOT NULL CHECK (entity_name IN ('customer', 'vehicle', 'transaction')),
    field_key VARCHAR(64) NOT NULL,
    data_type VARCHAR(32) NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'select', 'boolean')),
    is_required BOOLEAN DEFAULT false,
    options_json JSONB DEFAULT '[]'::jsonb,
    validation_regex VARCHAR(255),
    label_i18n JSONB NOT NULL DEFAULT '{"en": "Custom Field"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, entity_name, field_key)
);

-- 5. Dynamic Rules Engine Tables with Real Scope Columns (B2, B3, B4)
CREATE TABLE IF NOT EXISTS rule_sets (
    rule_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    category VARCHAR(32) NOT NULL CHECK (category IN ('sale', 'service', 'accessory', 'bodyshop', 'inhouse_bonus', 'referral', 'redemption')),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, category, name)
);

CREATE TABLE IF NOT EXISTS rule_versions (
    rule_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_id UUID NOT NULL REFERENCES rule_sets(rule_set_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('draft', 'pending_approval', 'published', 'archived')),
    
    -- Real Scoping Columns (B2)
    brand_id VARCHAR(64) REFERENCES master_brands(brand_id),
    branch_id VARCHAR(64),
    vehicle_type VARCHAR(32) CHECK (vehicle_type IN ('2W', '4W')),
    model_id VARCHAR(64) REFERENCES master_models(model_id),
    transaction_type VARCHAR(32),
    priority INTEGER NOT NULL DEFAULT 100, -- Deterministic tie-breaker
    
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    
    -- Validated Formula Config & Rates (B3, B4)
    formula_config JSONB NOT NULL,
    redemption_rate_rupees_per_point NUMERIC(10,4) NOT NULL DEFAULT 0.2500, -- Rate name unified
    
    created_by UUID NOT NULL,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Maker-Checker Constraint (B3)
    CONSTRAINT chk_maker_checker CHECK (status <> 'published' OR approved_by <> created_by),
    UNIQUE (rule_set_id, version_number)
);

-- 6. Cashier Invites Table (C1 & B8)
CREATE TABLE IF NOT EXISTS user_invites (
    invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    branch_id VARCHAR(64) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(32) NOT NULL REFERENCES roles(role_id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. App-Wide Settings & i18n (B8)
CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id VARCHAR(64) PRIMARY KEY REFERENCES firms(tenant_id) ON DELETE CASCADE,
    max_daily_cashier_points_limit INTEGER DEFAULT 50000,
    max_per_tx_cashier_points_limit INTEGER DEFAULT 10000,
    high_value_issuance_threshold INTEGER DEFAULT 10000,
    require_manager_approval_above INTEGER DEFAULT 10000,
    enable_2fa BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS i18n_translations (
    translation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    lang_code VARCHAR(10) NOT NULL CHECK (lang_code IN ('en', 'kn', 'hi', 'mr')),
    translation_key VARCHAR(128) NOT NULL,
    translation_value TEXT NOT NULL,
    UNIQUE (tenant_id, lang_code, translation_key)
);

-- 8. Persistent Job Queue Tables (PostgreSQL-native via pg-boss) (B8, B10)
CREATE TABLE IF NOT EXISTS pgboss_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    data JSONB,
    state VARCHAR(32) DEFAULT 'created',
    created_on TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Upgraded Audit Logs Table (B8)
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES firms(tenant_id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_name VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strict Append-Only Trigger on Audit Logs (B8)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is strictly append-only.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- 10. Ledger Schema Updates & Valuation Rate Snapshot Column (B3, B4, B6)
ALTER TABLE points_ledger 
ADD COLUMN IF NOT EXISTS rule_version_id UUID REFERENCES rule_versions(rule_version_id),
ADD COLUMN IF NOT EXISTS redemption_rate_snapshot NUMERIC(10,4) DEFAULT 0.2500, -- B3 Snapshot Column
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
ADD COLUMN IF NOT EXISTS merge_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency 
ON points_ledger (tenant_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

---

## 2. Multi-Tenancy Architecture & Transaction-Local RLS (Fixing B7, LOOP-20)

### 2.1 Pool-Safe Transaction-Local RLS Enforcement (Fixing B7)
To prevent cross-tenant parameter leakage across pooled Node.js database connections:
1. **Transaction-Local Setting**: Executed **inside every active database transaction handle**:
   ```sql
   -- Set tenant_id scoped strictly to the current transaction
   SELECT set_config('app.current_tenant_id', $1, true);
   ```
2. **PostgreSQL RLS Policies with `WITH CHECK` and `FORCE`**:
   ```sql
   ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
   ALTER TABLE points_ledger FORCE ROW LEVEL SECURITY;

   CREATE POLICY tenant_isolation_policy ON points_ledger
   AS RESTRICTIVE
   USING (tenant_id = current_setting('app.current_tenant_id', true))
   WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
   ```
3. **Application Connection Role Isolation**:
   - The primary Express app connects as a restricted role (`loyalty_app_role`), which is **NOT** a superuser or table owner.
   - Database migrations, background job workers, and Super Admin cross-tenant analytics execute using explicitly named, separate roles (`loyalty_migrator_role`, `loyalty_worker_role`).

---

## 3. Dynamic Rules Engine, Scope Precedence & Per-Vehicle Expiry (Fixing B2, B3, B5)

### 3.1 Deterministic Scope Precedence Resolution (Fixing B2)
Rules are queried using explicit indexing on real table columns with tie-breaking priority:  
$$\text{Scope Priority Order: } \text{Model} > \text{Vehicle Type} > \text{Branch} > \text{Brand} > \text{Tenant Default}$$
```sql
SELECT r.* FROM rule_versions r
WHERE r.tenant_id = $1
  AND (r.brand_id IS NULL OR r.brand_id = $2)
  AND (r.branch_id IS NULL OR r.branch_id = $3)
  AND (r.vehicle_type IS NULL OR r.vehicle_type = $4)
  AND (r.model_id IS NULL OR r.model_id = $5)
  AND r.status = 'published'
  AND NOW() BETWEEN r.effective_from AND COALESCE(r.effective_to, '9999-12-31')
ORDER BY 
  (CASE WHEN r.model_id IS NOT NULL THEN 16 ELSE 0 END +
   CASE WHEN r.vehicle_type IS NOT NULL THEN 8 ELSE 0 END +
   CASE WHEN r.branch_id IS NOT NULL THEN 4 ELSE 0 END +
   CASE WHEN r.brand_id IS NOT NULL THEN 2 ELSE 0 END) DESC,
  r.priority DESC
LIMIT 1;
```

### 3.2 Exact Per-Vehicle Expiry Behavior (Fixing B5)
- **Current Behavior Preserved as Default Mode**: Expiry is tracked **per vehicle** (`vehicles.redemption_eligible_at` and `redemption_expires_at`).
  1. **12-Month Lock Period**: Points earned from vehicle purchase remain locked for 12 months from purchase date.
  2. **24-Month Expiry Window**: After 12 months, vehicle status becomes `eligible`.
  3. **Redemption Clock Reset**: Performing a redemption updates `redemption_expires_at = NOW() + 24 months` on that specific vehicle.
- **Immutable Valuation Decision (B5 & C.2)**:
  - **Option 1 (Adopted Recommendation)**: The redemption rate in force **at redemption time** applies to all redeemed points. Rate changes are announced to customers 30 days in advance. Historical ledger entries store `redemption_rate_snapshot` for financial auditing.

---

## 4. Financial Ledger Safety & Re-enabled Triggers (Fixing B6, LOOP-21)

1. **Re-enabling Append-Only Trigger & Revoking Privileges (`LOOP-21`)**:
   ```sql
   ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
   REVOKE UPDATE, DELETE, TRUNCATE ON points_ledger FROM loyalty_app_role;
   ```
2. **Handling Legacy Ledger Columns (Fixing B6)**:
   - All new columns (`rule_version_id`, `idempotency_key`, `merge_id`) added as `NULLABLE`.
   - Legacy rows are preserved without active backfill, accessed via `COALESCE` views.
3. **Ledger-Safe Customer Merge (Fixing B6)**:
   - Replaces `UPDATE points_ledger SET customer_id = ...` with two atomic entries:
     - Old Account: `INSERT INTO points_ledger (..., type, points, merge_id) VALUES (..., 'transfer_out', -balance, merge_uuid)` carrying original earn date metadata in JSONB context.
     - Surviving Account: `INSERT INTO points_ledger (..., type, points, merge_id) VALUES (..., 'transfer_in', +balance, merge_uuid)`.
   - Historical merges that previously used SQL `UPDATE` remain untouched as immutable past history.
4. **Scheduled DB Reconciliation Job**: Daily job computes `SUM(points)` from `points_ledger` vs cached customer balance, alerting admins on any variance.

---

## 5. Manual Credit Caps & High-Value Approvals (Fixing B9, LOOP-03)

1. **Earning Classification**:
   - **Rule-Calculated Earnings (Automatic)**: Invoice-based sales/service earnings calculated automatically via rules engine have **no artificial cap**, but trigger an anomaly alert if transaction amount > ₹25,00,000.
   - **Manual Credits & Bonus Issuances**: In-house bonuses, manual adjustments, and referral approvals are capped at **10,000 points/transaction** and **50,000 points/day per cashier**.
2. **Manager Approval Threshold**:
   - Manual point issuances exceeding **10,000 points** require Branch Manager sign-off via OTP before ledger insertion.

---

## 6. Granular RBAC Permission Matrix & Postgres Infrastructure Choice (Fixing B10)

### 6.1 Route Permission Matrix (Exhaustive)

| Route Endpoint | Method | Required Permission | Scoping |
| :--- | :--- | :--- | :--- |
| `/api/customers` | GET | `customers:read` | Branch |
| `/api/customers` | POST | `customers:create` | Branch |
| `/api/customers/:id` | GET | `customers:read` | Branch |
| `/api/customers/:id` | PUT | `customers:update` | Branch |
| `/api/customers/:id` | DELETE | `customers:manage` | Tenant |
| `/api/customers/:id/kyc-change` | POST | `kyc:create` | Branch |
| `/api/admin/kyc-change/:id/approve` | POST | `kyc:approve` | Tenant |
| `/api/points/earn` | POST | `points:create` | Branch |
| `/api/points/inhouse-bonus` | POST | `points:issue` | Branch |
| `/api/redemptions/redeem` | POST | `redemptions:create` | Branch |
| `/api/corrections/raise` | POST | `corrections:create` | Branch |
| `/api/admin/corrections/:id/approve`| POST | `corrections:approve`| Tenant |
| `/api/gift-cards/issue` | POST | `giftcards:issue` | Tenant |
| `/api/admin/merge` | POST | `customers:manage` | Tenant |

### 6.2 Infrastructure Architecture: Postgres-Only (Fixing B10, C.8)
- **Zero-Redis Architecture**: To minimize infrastructure cost, the platform uses **PostgreSQL-only**:
  - Persistent Async Queue: `pg-boss` running on dedicated PostgreSQL tables.
  - Rate Limiting: Un-logged PostgreSQL table `rate_limit_hits`.
  - Permission Cache: In-memory LRU cache inside Node process with short TTL (60 seconds) and permission version checks.

---

## 7. Three Distinct Persona Dashboards (Fixing B11)

```
                               ┌──────────────────────────────────┐
                               │     Multi-Tenant Access Shell    │
                               └────────────────┬─────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌─────────────────────────┐          ┌─────────────────────────┐            ┌─────────────────────────┐
│ 1. Super Admin Portal   │          │ 2. Tenant Admin Console │            │ 3. Cashier & Manager    │
├─────────────────────────┤          ├─────────────────────────┤            ├─────────────────────────┤
│ • Global Tenant List    │          │ • Firm Operations       │            │ • Counter POS Interface │
│ • Subscription Billing  │          │ • Rule Config & Publish │            │ • Quick Customer Search │
│ • Platform Feature Flags│          │ • KYC & Correction Queue│            │ • OTP Earning & Redeem  │
│ • System Audit Logs     │          │ • Manager Approvals     │            │ • Print Receipt Dialog  │
└─────────────────────────┘          └─────────────────────────┘            └─────────────────────────┘
```

---

## 8. Low-Code Control Center Engine & Server-Side Action Registry (Fixing B12)

1. **Server-Side Action Registry**:
   - Custom UI buttons and actions **must** match a server-side allowlisted action registry (`ACTION_REGISTRY`). No client-supplied URLs or arbitrary code execution permitted.
   - Example Registry Item:
     ```javascript
     const ACTION_REGISTRY = {
       'RAISE_CORRECTION': { permission: 'corrections:create', handler: 'CorrectionController.raise' },
       'APPROVE_KYC': { permission: 'kyc:approve', handler: 'KycController.approve' }
     };
     ```
2. **Control Center Data Model Tables (B12)**:
   - `control_center_menus`: Dynamic sidebar and section visibility JSON.
   - `control_center_layouts`: Dashboard JSON grid layout specifications.
   - `control_center_workflows`: Step-by-step approval chain JSON definitions.
3. **Resilience Fallback**: All JSON definitions validated against versioned Zod schemas. On failure, engine automatically falls back to **last known good configuration**.

---

## 9. Gift-Card Platform & Internal Showroom Voucher Adapter (Fixing B13)

1. **Dual-Phase Order Lifecycle**:  
   `Initiated` ➔ `Points_Held` ➔ `Vendor_Called` ➔ `Issued` | `Refunded` (Points hold released automatically on failure).
2. **Encrypted Code Storage**:
   - Codes encrypted using AES-256-GCM (`crypto.cipher`). Encryption Key ID stored in `gift_cards.key_id`. Unencrypted code displayed **once** to customer.
3. **Adapter Architecture**:
   - `InternalShowroomVoucherAdapter`: Primary launch adapter generating valid, trackable gift cards redeemable at client's own dealership showrooms.
   - `ExternalVendorAdapter` (Qwikcilver, Pine Labs, Woohoo stubs for future phases).

---

## 10. Provisioning, Privacy & Aadhaar Compliance (Fixing B14, B15, LOOP-25)

1. **Idempotent Tenant Provisioning (B14)**:
   - Single atomic DB transaction `provisionTenant(tenantConfig)` seeding roles, default rules, brand slug (`firms.brand_slug`), and initial admin invite. Supports `--dry-run`.
2. **Aadhaar Protection & Privacy Compliance (B15, LOOP-25)**:
   - **No Full Aadhaar Storage**: Storing 12-digit Aadhaar numbers in plaintext is strictly prohibited.
   - **Masking & Hashing**: Store only masked Aadhaar (`XXXX-XXXX-1234`) for counter UI display and a salted SHA-256 hash (`aadhaar_hash`) for trigram deduplication.
   - PII excluded from `points_ledger` rows (referenced strictly via immutable `customer_id`).

---

## 11. Testing, Rollout & Phased Timeline (Fixing B16, B17)

### 11.1 Golden Test Suite & Baseline Capture (B17)
- Before code modifications, capture baseline calculations from current production logic for 100 historical anonymized invoices.
- Intentional baseline changes documented:
  - `LOOP-11`: Referral category corrected from `'sale'` to `'referral'`.
  - `LOOP-12`: Service UI preview corrected from 1% to 4%.

### 11.2 Phased Rollout Schedule (B16)

```
Phase 1: Architecture & Test Harness Setup (Days 1–3)
Phase 2: Security & Loophole Patching (LOOP-01 to LOOP-25) (Days 4–7)
Phase 3: Persistent Queue (pg-boss) & Ledger Safety (Days 8–11)
Phase 4: Dynamic Rules Engine & Shadow Mode Dual-Run (Days 12–16)
Phase 5: RBAC, Cashier Invites & Tenant Provisioning (Days 17–20)
Phase 6: Control Center Stage 1 & 3 Persona Dashboards (Days 21–25)
Phase 7: Customer UI Redesign & Internal Showroom Gift Cards (Days 26–29)
Phase 8: Control Center Stage 2/3 & Final UAT Cutover (Days 30–33)
```

- **Shadow Mode Execution**: Rules Engine runs in dual-execution mode for 7 days (computing points using both legacy engine and new rules engine, logging discrepancies without blocking sales) prior to full cutover.

---

## 12. Business Decisions Summary Table (Section C)

| # | Business Question | Status / Adopted Default |
|---|---|---|
| 1 | **Expiry Mode** | **Adopted**: Per-vehicle behavior (12-month lock, 24 months, reset on redemption). |
| 2 | **Redemption Rate Changes** | **Adopted**: Rate at redemption time applies to all points; rate changes announced 30 days in advance. |
| 3 | **Manual Credit Limits** | **Adopted**: Rule-calculated earnings uncapped; manual/bonus credits capped at 10k/tx & 50k/day. |
| 4 | **Negative Balance on Deal Cancellation** | **Adopted**: Allowed; balance must return positive before next redemption. |
| 5 | **Referral Fraud Checks** | **Adopted**: Same phone, address, device, bank account blocked; max 5 referrals/month per referrer. |
| 6 | **First Gift-Card Vendor** | **Adopted**: Internal Showroom Voucher adapter first. |
| 7 | **Launch Languages** | **Adopted**: Dual-language launch: English & Kannada. |
| 8 | **Infrastructure Choice** | **Adopted**: PostgreSQL-Only (`pg-boss`, DB rate limits, in-memory LRU permission cache). |

---

> 🛑 **PRIME DIRECTIVE ACKNOWLEDGMENT**: Both `AUDIT.md` and `PLAN.md` are 100% updated and verified against the workspace codebase. **No production code has been modified. Awaiting your approval before proceeding.**
