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
