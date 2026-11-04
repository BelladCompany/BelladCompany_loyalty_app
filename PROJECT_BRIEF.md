# Project Brief: Automobile Dealership Group Loyalty Program

## Overview
Loyalty program for an automobile dealership group (multiple brands, multiple branches). Used by cashiers at the counter, not by customers directly (customers only get WhatsApp messages, no customer-facing app or login).

## Tech Stack
*Fixed — do not substitute or add other stacks:*
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** React + Tailwind CSS
- **Auth:** JWT, role-based (roles: cashier, admin)

## Core Identity Rule
- `customer_id` is the only identity key.
- `customer_id` is system-generated (format `BAC-100001`, incrementing), immutable, and NEVER derived from phone number or name.
- A customer can have multiple phone numbers and multiple vehicles across multiple brands/branches — all linked to one `customer_id`.
- Phone number is NEVER used as a primary key anywhere.

## Points Rules
- **Sale:** `points = ex-showroom price / 100` (ex-showroom only, pre-tax, not on-road price)
- **Service:** `points = (bill amount / 100) * 4`
- **Referral:** NOT a formula. Referral points are always entered manually by an authorized approver (a small named list, e.g. admins), with a mandatory reason field. Never auto-calculated.
- **Conversion:** `4 points = 1 rupee`, always, both earning and redeeming.
- **Math Precision:** All monetary/point math uses integer or fixed-point values, never floating point.

## Required Database Tables
*Every table includes `tenant_id`, `created_at`, `updated_at`. Do not add extra tables beyond these unless explicitly requested:*
- `customers`
- `customer_phones`
- `vehicles`
- `branches`
- `brands`
- `point_rules` (rate_type: sale/service, points_per_100, effective_from; sale/service formulas are configurable data, not hardcoded numbers)
- `system_settings` (key, value, description; tunable numbers with defaults: redemption_lock_days=365, otp_expiry_minutes=10, otp_max_requests_per_hour=5, otp_max_attempts=3)
- `points_ledger` (append-only, no updates/deletes)
- `tier_rules`
- `customer_tier_snapshot`
- `referral_approvers`
- `referrals`
- `otp_requests`
- `redemptions`
- `users`
- `audit_log`
- `realbooks_sync_log`
- `customer_merge_log`

## Key Workflows
1. **Earning:** Cashier looks up customer by phone -> resolves to `customer_id` via `customer_phones` -> enters amount -> points calculated -> ledger entry -> tier recalculated -> WhatsApp sent.
2. **Redemption:** Customer requests OTP -> cashier enters OTP + points to redeem -> validated -> discount applied -> unique code generated -> synced to RealBooks.
3. **Duplicate Resolution:** Flagged, never auto-merged, admin approves merge, audit trail kept.
4. **Referral:** Manually entered and approved, never automatic.

## System Constraints
- DO NOT invent additional business rules, discount types, or loyalty mechanics not listed above.
- DO NOT rename `customer_id` or change its format.
- DO NOT use phone number as a primary key anywhere.
- DO NOT use floating point for money or points.
- DO NOT add a customer-facing login/app (there isn't one).

## Open questions
1. **Tier Rules & Calculations:** What are the exact tier threshold levels, rules, and calculation frequency for `tier_rules` and `customer_tier_snapshot`?
   - **Resolved (placeholder):** Tier thresholds (stored in `tier_rules`): Silver 0-4999, Gold 5000-14999, Platinum 15000+ lifetime points. Snapshot/calculation frequency to be finalized.
2. **OTP Generation & Delivery:** What is the exact OTP length, expiration period, retry policy, and gateway configuration for `otp_requests`?
   - **Resolved (placeholder):** 6-digit numeric OTP, 10 minute expiry, max 5 requests/hour/customer, lockout after 3 failed attempts. Values configurable via `system_settings`.
3. **Duplicate Identification Criteria:** What exact conditions or matching fields flag two customer accounts as duplicates prior to admin resolution?
   - **Resolved (placeholder):** Flag when the same phone number appears under a different name, OR name similarity above 0.6 (`pg_trgm`) with a different phone number. Never auto-merged.
4. **RealBooks Sync Payload & Protocol:** What exact API specifications, retry strategy, and payload format are needed for `realbooks_sync_log` integration?
   - **Resolved (placeholder):** Build as a swappable adapter module assuming REST + API key, until real API docs are provided. Payload format is a placeholder pending real input.
5. **Multitenancy & Branch/Brand Scoping:** How is `tenant_id` assigned and how are multi-branch and multi-brand permissions enforced per user role?
   - **Resolved (placeholder):** `tenant_id` is a fixed constant for now (single tenant); branch/brand access enforced via `user.branch_id` and role instead.

> **Placeholder notice:** The tier thresholds (question 1) and the RealBooks payload/protocol (question 4) are PLACEHOLDERS pending real input — NOT final specifications.



┌────────────────────────────────────────────────────────────────────────┐
│                        LOYALTY DATABASE ENGINE                         │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│    1. IMMUTABILITY   │   2. CONCURRENCY &   │      3. DATA PRIVACY     │
│   & FINANCIAL AUDIT  │     DOUBLE-SPEND     │         & SECURITY       │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ • Append-Only Ledger │ • Idempotency Keys   │ • PII Masking (Aadhaar)  │
│ • No UPDATE / DELETE │ • Row-Level Locks    │ • SHA-256 Hash Lookups   │
│ • Full Audit Logs    │ • Negative Checks    │ • Strict RBAC Scopes     │
└──────────────────────┴──────────────────────┴──────────────────────────┘
1. Immutability & Financial Audit (points_ledger)
Append-Only Ledger: Points entries are never updated or deleted. Every transaction is an immutable record. If a cashier makes a correction, an offsetting adjustment record is appended.
Triggers in Place:
trg_prevent_points_ledger_modification: Automatically blocks any manual UPDATE or DELETE statements on the ledger.
trg_prevent_negative_points_balance: Guarantees a customer's total points balance can never drop below zero, preventing accidental over-redemption.
2. Concurrency & Double-Spend Protection
Idempotency Keys (idempotency_key): Every earn or redemption transaction generates a unique UUID idempotency key. If a network blip or double-click occurs at the counter, the second request is recognized and safely ignored without deducting points twice.
Transactional Row-Level Locking: During redemptions, PostgreSQL uses SELECT ... FOR UPDATE so concurrent actions on the same account are queued serially, eliminating race conditions.
3. Optimized Indexing for Millions of Records

Our local database currently has 64 tables and over 140 indexes, including:

Composite Indexes: (tenant_id, customer_id, created_at DESC) on points_ledger and transactions so balance calculations and ledger pagination remain sub-millisecond even with 500,000+ entries.
Search Indexes: Trigram (pg_trgm) and lower-case B-Tree indexes on customer names, phone numbers, and vehicle registration numbers for instant lookup.
Filtered Partial Indexes: Indexes on status = 'pending' for redemptions and approvals, ensuring query speed doesn't degrade as approved records accumulate.
4. Data Security & Regulatory Compliance (DPDP Act)
Aadhaar Masking: Full 12-digit Aadhaar cards are never stored in raw readable format in logs or public responses. They are stored as masked strings (XXXX-XXXX-1912) and hashed (aadhaar_hash) for matching.
Separation of Roles (RBAC): Cashiers, managers, and directors have isolated permissions. Cashiers cannot modify rules or issue manual points without supervisor approval.
Customer Portal Isolation: Portal JWT tokens carry restricted customer roles and are prevented from calling internal staff or counter APIs.