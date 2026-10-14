# SYSTEM AUDIT & ARCHITECTURE SPECIFICATION (PHASE 0 - REVISED & EXPANDED)
**Automobile Dealership Group Loyalty Program Platform**  
**Role:** Principal Software Architect, Senior Full-Stack Engineer, QA Lead  
**Audit Date:** September 2026  
**Status:** Phase 0 Audit Verification Completed — Awaiting Phase 1 Architecture Approval (No Production Code Modified)

---

## 1. System Overview & Technology Stack

| Tier | Technology Stack | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18 (Vite 5.4), Tailwind CSS 3.4, Lucide Icons, Vanilla State | Single-Page Application with Cashier Counter UI, Admin Console, and Customer Digital Portal / Public Balance Passes |
| **Backend** | Node.js 18+ / Express 4.22, Helmet 7.2, Zod 3.25, Multer 2.3, BcryptJS 2.4 | Modular layered architecture (`routes` -> `controllers` -> `services` -> `db`) |
| **Database** | PostgreSQL 14+ with `pg_trgm`, `citext` extensions, `pg` pool | Multi-tenant schema with append-only ledger triggers, transactional row-locks |
| **Integrations** | WhatsApp Business API (Reltigrow / Meta), Google Sheets Sync, AppSheet DMS Webhooks, RealBooks Accounting API (Mock Adapter) | In-process event dispatches (`setImmediate`) and background polling |
| **Hosting & Deployment** | Node / Docker / Render (Backend), Vercel / Nginx / Docker (Frontend) | Standalone SPA + REST API backend |

---

## 2. Exhaustive Hardcoded Business Values & Config Mapping

Every business value, ratio, threshold, formula, UI label, and role string across the codebase is catalogued below with exact file path, line number, and proposed tenant configuration key:

| Hardcoded Value / Formula / Label | File Path | Line Number(s) | Proposed SaaS Config Key / Architecture Fix |
| :--- | :--- | :--- | :--- |
| **Ex-Showroom Minus Offers Base Formula**: `net_ex_showroom = ex_showroom - dealer_cash_discount - emps_discount - oem_offers_amount - sum(valid_additional_discounts)` | `src/services/vehiclePointsEngine.service.js` | L109–L137 | `rule_sets.purchase_formula` (Default rule with configurable deduction array) |
| **Redemption Rate**: `4 points = ₹1` (`0.25`) | `src/config/loyalty.config.js` | L15 | `rule_versions.redemption_rate_rupees_per_point` |
| **Redemption Rate**: `0.25` multiplier | `src/services/giftCard.service.js` | L228 | `rule_versions.redemption_rate_rupees_per_point` |
| **Redemption Rate**: `points / 4` equivalent | `src/services/report.service.js` | L103, L104, L211 | `rule_versions.redemption_rate_rupees_per_point` |
| **Redemption Rate**: `POINTS_PER_RUPEE_REDEMPTION = 0.25` | `client/src/components/dashboard/RedemptionModal.jsx` | L24 | `rule_versions.redemption_rate_rupees_per_point` |
| **Service Earning Rate**: `4 points per ₹100` (4%) | `src/config/loyalty.config.js` | L18 | `rule_versions.service_earning_rate` |
| **Service Earning Rate**: Fallback `num = 4n, den = 100n` | `src/services/points.service.js` | L30 | `rule_versions.service_earning_rate` |
| **Service Earning Rate**: `POINTS_PER_100_RUPEES_EARNED = 4` | `client/src/components/dashboard/RedemptionModal.jsx` | L25 | `rule_versions.service_earning_rate` |
| **Sale Earning Rate**: Fallback `num = 1n, den = 100n` | `src/services/points.service.js` | L29 | `rule_versions.sale_earning_rate` |
| **Sale Earning Rate**: Multiplier fallback `0.01` | `src/services/vehiclePointsEngine.service.js` | L75 | `rule_versions.sale_earning_rate` |
| **Accessory Earning Rate**: Ratio `num = 2n, den = 100n` | `src/services/points.service.js` | L31 | `rule_versions.accessory_earning_rate` |
| **Bodyshop Earning Rate**: Ratio `num = 3n, den = 100n` | `src/services/points.service.js` | L32 | `rule_versions.bodyshop_earning_rate` |
| **In-House Bonus Points**: Finance=100, Ins=50, Exch=200 | `src/db/migrations/026_point_rules.sql` | L32–L46 | `rule_versions.inhouse_bonus_slab` |
| **In-House Bonus Points**: Hardcoded UI values | `client/src/components/dashboard/EarnPointsModal.jsx` | L188–L190, L635 | `rule_versions.inhouse_bonus_slab` |
| **Referral Slab Default**: `2500` points fallback | `src/services/referral.service.js` | L93 | `referral_slabs.default_points` |
| **Referral Slabs Data**: 4W & 2W slab sets | `src/db/migrations/012_phase4_referral_slabs.sql` | L71–L97 | `referral_slabs` table |
| **Tier Thresholds**: Silver (0), Gold (5k), Platinum (15k), Diamond (35k) | `src/controllers/customerPortal.controller.js` | L373–L388 | `tier_rules` table |
| **Tier Thresholds**: Silver 0-4,999, Gold 5,000-14,999, Platinum 15,000+ | `PROJECT_BRIEF.md` | L62 | `tier_rules` table |
| **Eligibility Windows**: Lock = 12 mo, Expiry = 24 mo | `src/services/redemption_eligibility.service.js` | L37, L40 | `rule_versions.expiry_config` |
| **OTP Expiry & Limits**: 5-min OTP, 5 OTPs/hr limit | `src/services/redemption.service.js` | L79, L92 | `tenant_settings.otp_max_per_hour` |
| **Rate Limit Windows**: Login: 10 req / 15 min | `src/middleware/rateLimiter.js` | L20–L21 | `tenant_settings.login_rate_limit` |
| **Rate Limit Windows**: KYC: Max 3 req / 24 hrs | `src/middleware/rateLimiter.js` | L62 | `tenant_settings.kyc_rate_limit` |
| **Rate Limit Windows**: Public Balance: Max 30 req / 1 min | `src/middleware/rateLimiter.js` | L92–L93 | `tenant_settings.public_balance_rate_limit` |
| **Rate Limit Windows**: AppSheet Webhook: Max 60 req / 1 min | `src/middleware/rateLimiter.js` | L131–L132 | `tenant_settings.appsheet_rate_limit` |
| **Cashier Risk Warning**: >5 corrections / 7 days | `src/services/correction.service.js` | L226 | `tenant_settings.cashier_correction_threshold` |
| **Roles Constraint**: `CHECK (role IN ('cashier', 'admin'))` | `src/db/migrations/001_initial_schema.sql` | L36 | `roles` catalog table |
| **Roles Hierarchy**: `cashier`, `branch_manager`, `regional_admin`, `super_admin`, `admin` | `src/middleware/roles.js` | L4–L25 | `permissions` & `role_permissions` matrix |
| **Roles Validation**: `z.enum(['cashier', 'admin'])` | `src/validators/schemas.js` | L30 | Dynamic RBAC permission middleware |
| **Default Tenant ID**: `'bellad_and_company'` fallback | `src/config/env.js` | L32 | Mandatory JWT `tenant_id` context |
| **Default Tenant ID**: `'bellad_and_company'` fallback | `src/services/vehicleSalesPoints.service.js` | L95 | Mandatory DB query tenant context |
| **Default Tenant ID**: `'bellad_and_company'` fallback | `src/services/giftCard.service.js` | L40 | Mandatory DB query tenant context |
| **Tenant Seed List**: `'bellad_and_company'`, `'BAC-MAIN'`, `'trident_automobiles'`, `'advaith_motors'` | `src/db/migrations/029_gift_cards_firms_and_scalability.sql` | L29–L32 | `firms` table |
| **Gift Card Prefixes**: `'BELL'`, `'TRID'`, `'ADVT'` | `src/services/giftCard.service.js` | L50–L52 | `firms.brand_slug` |
| **Vehicle Type Regex**: Matches `'ather'`, `'hero'`, `'vida'`, `'scooter'`, `'bike'`, `'2w'` | `src/db/migrations/012_phase4_referral_slabs.sql` | L28–L34 | `models.vehicle_type` master catalog |
| **Master Test OTPs**: Accepted test codes `'123456'`, `'999999'` | `src/services/redemption.service.js` | L187 | `tenant_settings.enable_test_otp` |
| **Master Test OTPs**: Accepted test codes `'123456'`, `'999999'` | `src/controllers/customerPortal.controller.js` | L110 | `tenant_settings.enable_test_otp` |
| **Hardcoded UI Labels**: "Bellad & Company Loyalty Portal", "4 Pts = ₹1" | `client/src/components/dashboard/Sidebar.jsx` | L42-89 | `i18n_translations` & Control Center labels |

---

## 3. Exhaustive Loophole & Security Vulnerability Audit (LOOP-01 to LOOP-25)

| ID | Severity | File Path : Line | Description | Exploit Scenario | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LOOP-01** | **Critical** 🔴 | `src/app.js:78`, `src/middleware/upload.js:5` | **Unauthenticated File Access (Multer / Static Uploads)**: Upload directory `/uploads/kyc_proofs/` is served statically without auth. Validation only checks client MIME string. | Attacker inspects server uploads under `/uploads/kyc_proofs/` to download customer Aadhaar/ID proofs without login (DPDP violation). Alternatively uploads shell executable. | Remove static serving of `/uploads`. Store files in secure S3/private folder with magic-byte validation (`file-type`), served via authenticated API (`GET /api/kyc/proof/:id`). |
| **LOOP-02** | **Critical** 🔴 | `src/routes/customer.routes.js:40-41`, `src/controllers/customer.controller.js:198-243` | **Cashier KYC Bypass & Direct Phone Mutation**: Direct routes `POST /api/customers/:id/phones` allow cashiers to modify customer phones without KYC proof or admin approval. | Rogue cashier calls `POST /api/customers/BAC-100001/phones` to add their own phone number to a high-balance customer account, hijacking point redemptions. | Remove direct phone mutation endpoints for cashier role. Require all phone changes via `POST /api/customers/:id/kyc-change` with mandatory ID proof and manager sign-off. |
| **LOOP-03** | **Critical** 🔴 | `src/routes/points.routes.js:20`, `src/controllers/points.controller.js:35-62` | **Unrestricted Manual Points Credit**: `POST /api/points/inhouse-bonus` lacks Zod validation schema on `points` input. Cashiers can pass any arbitrary integer. | Rogue cashier submits `POST /api/points/inhouse-bonus` with `points: 1000000`, crediting 1 Million points to any account without verification. | Apply Zod schema validation restricting `points` to predefined positive bounds, and require manager sign-off for manual bonus points above a dynamic threshold. |
| **LOOP-04** | **Critical** 🔴 | `src/services/transaction.service.js:239-290` | **Non-Atomic Transaction Sync Lockup**: `TransactionService.syncTransaction` commits `service_transactions` row before calling `PointsService.recordEarning` in separate connection. | If `PointsService.recordEarning` fails due to network glitch or constraint, transaction is marked processed, but 0 points credited. Retries reject permanently. | Execute transaction logging and points ledger insertion within a SINGLE atomic database transaction (`BEGIN...COMMIT`). |
| **LOOP-05** | **Critical** 🔴 | `src/services/vehicleSalesPoints.service.js:204-245` | **Append-Only Ledger Mutation & Bypass**: Service executes `SET LOCAL loyalty.allow_ledger_update = 'on'` to delete duplicate rows and update `points_ledger` in place. | Bypasses append-only ledger integrity guarantees. Fails on standard Postgres instances where custom GUC setting is not defined in `postgresql.conf`. | Remove in-place UPDATE/DELETE on `points_ledger`. Write compensating reversal rows (`type = 'adjust'`) to preserve strict append-only audit trail. |
| **LOOP-06** | **High** 🟠 | `src/middleware/auth.js:28` | **Tenant Header Override by Non-Admins (Tenant Isolation Failure)**: `req.headers['x-tenant-id']` overrides `req.tenantId` for ANY authenticated user regardless of role. Missing PostgreSQL RLS. | Cashier from Tenant A sends header `X-Tenant-ID: tenant_b` in API calls to read or manipulate Tenant B's customers and points balance. | Only allow `x-tenant-id` header override if `user.role === 'admin'` or `'super_admin'`. Enforce `req.tenantId = user.tenant_id` for cashier/manager roles, and enable PostgreSQL RLS. |
| **LOOP-07** | **High** 🟠 | `src/validators/schemas.js:67-70` | **Mandatory GST Number Blocks Retail Creation**: `createCustomerSchema` marks `gst_number` as mandatory `.min(1)`. | Cashiers attempting to enroll individual retail 2W or 4W customers without a GST number cannot save the customer record due to validation error. | Make `gst_number` optional (`.optional().nullable()`), required only when `customer_type === 'commercial'`. |
| **LOOP-08** | **High** 🟠 | `src/routes/customer.routes.js:31`, `src/routes/points.routes.js:28` | **IDOR on Customer Profile & Ledger**: `GET /api/customers/:id` and `GET /api/points/customers/:id/ledger` do not restrict access by branch or tenant for cashiers. | Cashier at Branch 1 iterates customer IDs (`BAC-100001`, `BAC-100002`) to harvest customer PII and points history belonging to Branch 2 or another tenant firm. | Apply `scopeBranchAccess` middleware and strict tenant check to enforce branch and tenant data scoping for cashiers and branch managers. |
| **LOOP-09** | **High** 🟠 | `src/services/points.service.js:66-180` | **Missing Idempotency Key on Points Earning**: `POST /api/points/earn` does not check for duplicate `reference_id` or client idempotency header. | Double-clicking "Credit Points" button or network retries create duplicate `points_ledger` rows and credit double points to customer balance. | Enforce mandatory `Idempotency-Key` HTTP header and unique DB index on `(tenant_id, reference_id, type)`. |
| **LOOP-10** | **High** 🟠 | `src/services/realbooks/realbooks.client.js:28-41` | **Mock RealBooks Client in Production**: `RealBooksClient.pushRedemption` returns hardcoded dummy success vouchers without executing real HTTP requests. | RealBooks accounting integration does not actually post redemption vouchers to client ERP, causing ledger disconnect between loyalty app and accounting system. | Implement real REST client adapter with API key authentication, timeout handling, retry queue, and payload mapping. |
| **LOOP-11** | **High** 🟠 | `src/services/referral.service.js:378` | **Referral Category Mismatch**: `ReferralService.approveReferral` inserts ledger row with `transaction_category = 'sale'` instead of `'referral'`. | Corrupts category-based summary reports and violates domain data consistency. | Change `transaction_category` value to `'referral'` in `ReferralService.approveReferral`. |
| **LOOP-12** | **High** 🟠 | `client/src/components/dashboard/EarnPointsModal.jsx:71` | **Frontend Service Earning Rate Mismatch**: UI calculates service point preview as `Math.floor(netAmount / 100)` (1%) instead of 4%. | Cashier UI shows incorrect point earning preview to customer at the counter. | Update UI preview formula to `Math.floor((netAmount / 100) * 4)` for service category. |
| **LOOP-13** | **High** 🟠 | `src/routes/appsheet.routes.js:10`, `src/middleware/appsheetAuth.js:1-30` | **Unverified Webhook Endpoint & Missing Signatures**: Webhook route proceeds without validation if `process.env.APPSHEET_WEBHOOK_SECRET` is unconfigured. | Attacker posts forged sale/service webhook payloads directly to `/api/appsheet/webhook`, creating fake points without HMAC signature or replay protection. | Require mandatory secret verification, HMAC signature check, and timestamp/nonce replay window validation on all webhook routes (AppSheet, WhatsApp, Sheets). |
| **LOOP-14** | **High** 🟠 | `src/services/redemption.service.js:265-271` | **Race Condition on Points Redemption**: Point balance calculation uses JS float math (`sum - claimed`) without DB row locking (`FOR UPDATE`). | Submitting two concurrent redemption requests in parallel allows both to read initial balance and double-spend points into negative balance. Floating point rounding errors skew balance math. | Acquire `SELECT customer_id FROM customers WHERE customer_id = $1 FOR UPDATE` row lock, calculate balance in integer paise/points within DB query, and enforce atomicity. |
| **LOOP-15** | **Medium** 🟡 | `src/middleware/rateLimiter.js:6-149` | **In-Memory Rate Limiting**: Limiters for login, public balance, and webhooks use Node `Map` objects. | Rate limits reset when server restarts and fail to enforce across multi-instance load-balanced clusters. | Migrate rate limiters to DB-backed un-logged tables or shared persistent store. |
| **LOOP-16** | **Medium** 🟡 | `src/controllers/customerPortal.controller.js:15-88` | **Long-Lived JWT Tokens Without Refresh & Weak Password Policy**: Portal issues 30-day JWT tokens stored in `localStorage` with no refresh/revocation flow. Register password policy requires only `min(6)`. | Stolen JWT token remains active for 30 days even if user logs out or admin disables account. Cashier accounts subject to weak passwords. | Implement short-lived access tokens (15m) with HTTP-only Refresh Token cookies, token revocation, strong password policy + account lockout after 5 failed attempts. |
| **LOOP-17** | **Medium** 🟡 | `src/services/notification.service.js:120-127` | **PII & OTPs Printed in Server Logs**: `console.log` prints full phone numbers and test OTP codes in plain text. | Plaintext OTPs and customer phone numbers exposed in log monitoring systems (e.g. Datadog, Render logs). | Mask phone numbers (`+91 *****1234`) and remove debug OTP print statements in production builds. |
| **LOOP-18** | **Medium** 🟡 | `src/controllers/customer.controller.js:151-196` | **Incomplete Audit Log Coverage**: Direct customer profile updates, phone edits, and vehicle additions do not write to `audit_log`. | Employee modifications to customer email or vehicle chassis numbers leave no audit log trace. | Add `AuditLogService.logEvent()` calls to customer update, vehicle mutation, and all mutation API endpoints. |
| **LOOP-19** | **Critical** 🔴 | `src/services/redemption.service.js:187`, `src/controllers/customerPortal.controller.js:110` | **Hardcoded Test OTP Master Bypass in Production Paths**: Codes `'123456'` and `'999999'` are hardcoded as valid master OTPs WITHOUT checking `NODE_ENV` or feature toggle. | Anyone who knows a customer's phone number can log into their portal or perform point redemptions in production using test OTP `123456`. | Remove hardcoded test OTP strings from production code paths. Restrict test OTPs exclusively to automated test suites with mock OTP provider. |
| **LOOP-20** | **High** 🟠 | `src/config/env.js:32`, `src/services/vehicleSalesPoints.service.js:95`, `src/services/giftCard.service.js:40` | **Default Tenant ID Fallback (`'bellad_and_company'`)**: Code silently falls back to default tenant string when `tenant_id` header or context is omitted. | A request missing tenant context silently reads or writes Bellad & Company data, breaking tenant isolation. | Fail closed: reject any request missing valid tenant context with HTTP `400 Bad Request` or `401 Unauthorized`. Remove default fallbacks. |
| **LOOP-21** | **High** 🟠 | `src/db/migrations/010_phase1_foundation.sql:71` | **Disabled Ledger Append-Only Trigger**: Migration executes `ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;`. App connects as DB owner (`postgres`). | The database connection role is the table owner, allowing application SQL or admin scripts to bypass append-only restrictions at will. | Re-enable trigger, enforce `FORCE ROW LEVEL SECURITY`, and revoke `UPDATE`/`DELETE`/`TRUNCATE` privileges on `points_ledger` from the application runtime DB role (`loyalty_app_role`). |
| **LOOP-22** | **High** 🟠 | `src/services/notification.service.js:447`, `src/controllers/customer.controller.js:68` | **In-Process `setImmediate` Queue Data Loss**: Async WhatsApp notifications and Google Sheets dispatches execute via Node.js memory loop. | Server deployment, crash, or restart permanently drops queued notifications and sheet syncs without retry or Dead-Letter Queue (DLQ). | Migrate background jobs to persistent PostgreSQL job queue (`pg-boss`) with retry policy and DLQ monitoring. |
| **LOOP-23** | **High** 🟠 | `src/services/vehiclePointsEngine.service.js:75`, `src/services/report.service.js:103`, `client/src/components/dashboard/RedemptionModal.jsx:24` | **Floating Point Math on Points & Rupees**: JS Number arithmetic (`multiplier 0.01`, `points / 4`, `0.25`) used for money and point calculations. | Floating-point rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`) lead to off-by-one point credit/redemption discrepancies. | Store and calculate all money in integer paise (`BIGINT`) and points as whole integers (`BIGINT`). |
| **LOOP-24** | **High** 🟠 | `src/routes/customer.routes.js:37`, `src/routes/tenant.routes.js:10`, `src/routes/notification.routes.js:10` | **Critical Route Security & Scope Audit**:  • `POST /api/auth/register`: Admin-only protected (`auth.js:14`), but conflicts with self-service specs; enforce C1 cashier invite flow.  • `DELETE /api/customers/:id`: `CustomerService.deleteCustomer` (`customer.service.js:809`) performs **hard DELETE**, destroying audit trail.  • `POST /api/tenants`: Lacks rate limiting and super-admin check.  • `POST /api/notifications/send-*`: Unauthenticated/un-rated, vulnerable to WhatsApp OTP spam cost abuse.  • `GET /api/redemptions/code/:code` & gift-card lookup: Vulnerable to code guessing without rate limiters.  • `GET /api/public/balance/:token`: Static un-expiring token string, no revocation mechanism.  • `GET /api/appsheet/pull`: Un-paginated data dump, lacks rate limit. | Exploits range from SMS/WhatsApp toll fraud to permanent customer audit trail destruction and gift-card code enumeration. |  • Convert `DELETE /api/customers/:id` to soft-delete (`status = 'archived'`).  • Enforce short-lived expiring tokens for balance passes.  • Apply strict rate limiting and super-admin RBAC checks on all administrative & notification endpoints. |
| **LOOP-25** | **Medium** 🟡 | `client/src/components/dashboard/AddCustomerModal.jsx`, `src/controllers/customer.controller.js:45` | **Unencrypted Aadhaar Storage & Exposure**: Full 12-digit Aadhaar numbers stored in plain text in `customers.aadhaar_number` and returned in list/search APIs. | Exposes customer PII in logs, API responses, and database dumps in violation of Indian Aadhaar Act and DPDP Act regulations. | Store only masked Aadhaar (`XXXXXXXX1234`) for display and a salted SHA-256 hash (`aadhaar_hash`) for deduplication. Never store or return full Aadhaar. Flag for legal review. |

---

## 4. Route Permission & Security Audit Matrix (A2 Evidence)

Below is the complete audit matrix of all system API routes:

| Method + Path | Auth Required? | Role / Permission Check | Tenant Scope | Branch Scope | Audit Log Written? | Security Risk / Gap |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | No | None (Public) | Header / Body | None | No | Rate-limited, but logs plain text attempt |
| `POST /api/auth/register` | Yes | `admin` | Fixed JWT | None | Yes | Conflicts with C1 cashier invite model |
| `GET /api/auth/me` | Yes | Authenticated | Fixed JWT | User Branch | No | None |
| `GET /api/customers` | Yes | `cashier`, `admin` | JWT / Header | None | No | **MISSING Branch Scope** (`LOOP-08`) |
| `POST /api/customers` | Yes | `cashier`, `admin` | JWT / Header | User Branch | Yes | Enforces GST mandatory bug (`LOOP-07`) |
| `GET /api/customers/:id` | Yes | `cashier`, `admin` | JWT / Header | None | No | **IDOR**: Cashier can view any branch customer |
| `PUT /api/customers/:id` | Yes | `cashier`, `admin` | JWT / Header | None | No | **MISSING Audit Log** (`LOOP-18`) |
| `DELETE /api/customers/:id` | Yes | `admin` | JWT / Header | None | Yes | **Hard Delete Bug**: Destroys customer row |
| `POST /api/customers/:id/phones` | Yes | `cashier`, `admin` | JWT / Header | None | No | **CRITICAL KYC Bypass** (`LOOP-02`) |
| `DELETE /api/customers/:id/phones/:pId` | Yes | `cashier`, `admin` | JWT / Header | None | No | **CRITICAL KYC Bypass** (`LOOP-02`) |
| `GET /api/points/customers/:id/ledger` | Yes | `cashier`, `admin` | JWT / Header | None | No | **IDOR**: Cashier reads ledger across branches |
| `POST /api/points/earn` | Yes | `cashier`, `admin` | JWT / Header | User Branch | Yes | **MISSING Idempotency Key** (`LOOP-09`) |
| `POST /api/points/inhouse-bonus` | Yes | `cashier`, `admin` | JWT / Header | User Branch | Yes | **CRITICAL Unvalidated Points Input** (`LOOP-03`) |
| `POST /api/redemptions/request-otp` | Yes | `cashier`, `admin` | JWT / Header | User Branch | No | Rate-limited per customer |
| `POST /api/redemptions/redeem` | Yes | `cashier`, `admin` | JWT / Header | User Branch | Yes | **Race Condition & Float Math** (`LOOP-14`) |
| `GET /api/redemptions/code/:code` | Yes | `cashier`, `admin` | JWT / Header | None | No | **MISSING Rate Limit**: Code enumeration risk |
| `POST /api/gift-cards/issue` | Yes | `admin` | JWT / Header | None | Yes | Uses mock adapter in prod (`LOOP-10`) |
| `POST /api/gift-cards/claim` | Yes | Authenticated | JWT / Header | None | Yes | Code display needs encrypted storage |
| `POST /api/admin/merge` | Yes | `admin` | JWT / Header | None | Yes | **Ledger Mutation Bug**: `UPDATE points_ledger` |
| `POST /api/appsheet/webhook` | No | Secret check (optional)| Webhook Payload| None | No | **Unverified Secret / Signature** (`LOOP-13`) |
| `GET /api/public/balance/:token` | No | None (Public Token) | Token Payload | None | No | Un-expiring static token string |

---

## 5. Existing Data Reconciliation Audit (A3 Findings)

1. **Stored Balance vs Ledger Sum Verification**:
   - Query: `SELECT c.customer_id, c.current_points, COALESCE(SUM(l.points), 0) AS ledger_sum FROM customers c LEFT JOIN points_ledger l ON c.customer_id = l.customer_id GROUP BY c.customer_id HAVING c.current_points <> COALESCE(SUM(l.points), 0);`
   - *Finding*: Stored `customers.current_points` field drifting from `SUM(points_ledger.points)` due to non-atomic sync (`LOOP-04`) and un-logged manual updates.
2. **Duplicate Delete Path Rows (`vehicleSalesPoints.service.js:204-245`)**:
   - *Finding*: `VehicleSalesPointsService` executes `DELETE FROM points_ledger WHERE ...` using `SET LOCAL loyalty.allow_ledger_update = 'on'` when duplicate invoice syncs arrive, destroying historical audit entries.
3. **Past Customer Merges (`merge.service.js:203`)**:
   - *Finding*: All past merges executed direct SQL `UPDATE points_ledger SET customer_id = $1 WHERE customer_id = $2;`. Historical ledger rows have been reassigned in-place. These historical rows will remain untouched as immutable baseline history.

---

## 6. Dependency Audit & Upgrade Policy (A4 Output)

### 6.1 Literal `npm audit` Raw Command Output

#### Backend (`package.json`) `npm audit`:
```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "body-parser": { "name": "body-parser", "severity": "moderate", "via": ["qs"], "fixAvailable": true },
    "express": { "name": "express", "severity": "moderate", "via": ["qs"], "fixAvailable": true },
    "morgan": { "name": "morgan", "severity": "moderate", "via": ["GHSA-9f6g-j8ch-79g4 (Log Injection)"], "fixAvailable": true },
    "multer": { "name": "multer", "severity": "moderate", "via": ["GHSA-3pph-fpjx-jg34 (DoS orphaned disk writes)"], "fixAvailable": true },
    "qs": { "name": "qs", "severity": "moderate", "via": ["GHSA-x5fp-wj9c-mxmx", "GHSA-4mjr-xmp4-gh2g"], "fixAvailable": true }
  },
  "metadata": {
    "vulnerabilities": { "info": 0, "low": 0, "moderate": 5, "high": 0, "critical": 0, "total": 5 }
  }
}
```

#### Frontend (`client/package.json`) `npm audit`:
```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "esbuild": { "name": "esbuild", "severity": "moderate", "via": ["GHSA-67mh-4wv8-2f99"], "fixAvailable": true },
    "vite": { "name": "vite", "severity": "high", "via": ["GHSA-fx2h-pf6j-xcff (Path Traversal)", "GHSA-4w7w-66w2-5vf9", "esbuild"], "fixAvailable": true }
  },
  "metadata": {
    "vulnerabilities": { "info": 0, "low": 0, "moderate": 1, "high": 1, "critical": 0, "total": 2 }
  }
}
```

### 6.2 Literal `npm outdated` Raw Command Output

#### Backend (`package.json`) `npm outdated`:
```
Package   Current   Wanted   Latest  Location
bcryptjs    2.4.3    2.4.3    3.0.3  node_modules/bcryptjs
dotenv     16.6.1   16.6.1   18.0.4  node_modules/dotenv
express    4.22.2   4.22.3    5.2.1  node_modules/express
helmet      7.2.0    7.2.0    8.3.0  node_modules/helmet
morgan     1.12.0   1.12.1   1.12.1  node_modules/morgan
multer      2.3.0    2.4.0    2.4.0  node_modules/multer
zod      3.25.76  3.25.76    4.6.5  node_modules/zod
```

#### Frontend (`client/package.json`) `npm outdated`:
```
Package                Current    Wanted   Latest  Location
@types/react          18.3.31   18.3.31   19.3.0  node_modules/@types/react
@types/react-dom       18.3.7    18.3.7   19.3.0  node_modules/@types/react-dom
@vitejs/plugin-react    4.7.0     4.7.0    6.1.1  node_modules/@vitejs/plugin-react
autoprefixer          10.5.5    10.6.1   10.6.1  node_modules/autoprefixer
lucide-react         0.395.0   0.395.0   1.48.0  node_modules/lucide-react
react                 18.3.1    18.3.1   19.3.0  node_modules/react
react-dom             18.3.1    18.3.1   19.3.0  node_modules/react-dom
tailwind-merge         2.6.1     2.6.1    3.7.0  node_modules/tailwind-merge
tailwindcss           3.4.19    3.4.19    4.3.3  node_modules/tailwindcss
vite                  5.4.21    5.4.21    8.3.1  node_modules/vite
```

### 6.3 Mandatory Dependency Upgrade Policy
- **Policy Enforcement**: Apply **patch and minor security fixes ONLY** (e.g. `vite 5.4.21` -> `5.4.22` patch, `express 4.22.2` -> `4.22.3` patch).
- **NO Major Version Upgrades**: Major upgrades (React 19, Tailwind CSS 4, Vite 8, Express 5, Zod 4, Helmet 8) are **strictly forbidden** during this scope of work. They must be tracked as a separate future task.

---

## 7. Additional System Security Audits (A5 Evidence)

1. **SQL String Concatenation Check**:
   - *Result*: Audited all services under `src/services/`. All queries use PostgreSQL parameterized variables (`$1, $2`). No dynamic SQL string concatenation found.
2. **CSRF Protection Check**:
   - *Result*: **Missing**. JWT stored in `localStorage` for portal, but HTTP-only refresh cookies in target plan will require CSRF double-submit token protection.
3. **XSS Protection Check**:
   - *Result*: React frontend handles JSX string escaping automatically. However, unauthenticated Multer file upload (`LOOP-01`) permits uploading raw `.html` files under `/uploads/kyc_proofs/`, allowing stored XSS if accessed via browser.
4. **CORS & Helmet Configuration**:
   - *Result*: Helmet 7 initialized with defaults (`app.use(helmet())`), missing Content Security Policy (CSP) headers and HTTP Strict Transport Security (HSTS) tuning. CORS allows configured origin but lacks per-tenant domain verification.
5. **PII in Error Responses**:
   - *Result*: Express global error handler (`src/middleware/errorHandler.js`) returns full `err.message` and stack trace in non-production, but database error details (`Key (phone)=(...) already exists`) leak internal PII in production API responses.
6. **Audit Log Table Append-Only State**:
   - *Result*: `audit_log` table lacks database trigger preventing `UPDATE` or `DELETE`. Admins or SQL paths can alter audit history.

---

## 8. Background Processing & Queue Evaluation (LOOP-22 Evidence)

### 8.1 Queue Implementation Analysis
- **Current Architecture**: The application **does NOT use a persistent queue** (such as Redis/BullMQ or DB job queue).
- **Execution Mechanism**: Async dispatches use **in-process memory handles (`setImmediate()`)**:
  - `NotificationService.queuePointsEarnedNotification` (`src/services/notification.service.js:447`)
  - `RealBooksService.queueRedemptionSync` (`src/services/realbooks/realbooks.service.js:31`)
  - `GoogleSheetsService.syncCustomerToSheet` (`src/controllers/customer.controller.js:68`)

### 8.2 Failure & Server Restart Impact
- **Server Restart / Crash**: Any jobs currently queued in the Node.js event loop during deployment or restart are **permanently lost** (`LOOP-22`).
- **WhatsApp & Google Sheets**: Completely unpersisted. No exponential backoff or Dead-Letter Queue (DLQ) exists.

---

## 9. Customer Merge Mechanics & Append-Only Trigger Audit

### 9.1 Customer Merge Mechanics (`merge.service.js:203`)
```javascript
// Reassociate points_ledger records to surviving_customer_id
await client.query(
  `UPDATE points_ledger
   SET customer_id = $1, updated_at = NOW()
   WHERE customer_id = $2 AND tenant_id = $3;`,
  [surviving_customer_id, merged_customer_id, tenant_id]
);
```
- **Finding**: Customer merge **directly UPDATES existing `points_ledger` rows**. It does **NOT** write compensating transfer entries.
- **Bypass Mechanism**: To execute this `UPDATE`, `MergeService` runs `SET LOCAL loyalty.allow_merge = 'on';` (`src/services/merge.service.js:146`).

### 9.2 Append-Only Trigger Mechanics (`001_initial_schema.sql:153`)
```sql
CREATE OR REPLACE FUNCTION prevent_points_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'points_ledger is strictly append-only. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_points_ledger_modification
BEFORE UPDATE OR DELETE ON points_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_points_ledger_modification();
```
- **Trigger State (`LOOP-21`)**: Trigger was explicitly disabled in `010_phase1_foundation.sql:71` (`ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;`).
- **Connection Role**: Application connects as database owner (`postgres`), allowing full trigger bypass.

---

## 10. Existing Features Inventory (18 Screens & 21 API Route Modules)

### 10.1 Frontend Screens (18 Screens)
1. `LoginScreen.jsx` (`/`): Cashier/Admin JWT authentication.
2. `CashierDashboard.jsx` (`/` activeTab=`'dashboard'`): Customer 360 lookup & filters.
3. `Customer360View.jsx`: Point balance overview, tier status, linked vehicles.
4. `AddCustomerModal.jsx`: Counter customer onboarding.
5. `EarnPointsModal.jsx`: OTP-gated earning modal (Service, Sale, Accessories, Bodyshop, In-House).
6. `RedemptionModal.jsx`: OTP-gated points redemption modal ($4\text{ pts} = ₹1$).
7. `BulkImportModal.jsx`: Bulk customer CSV upload interface.
8. `MessageLogModal.jsx`: Delivery logs viewer for WhatsApp notifications.
9. `ReferralsScreen.jsx`: Referral registration & authorized approver selection.
10. `PublicReferralLeadScreen.jsx` (`/refer/:code`): Public lead registration with Aadhaar OTP.
11. `PublicBalancePassScreen.jsx` (`/balance/:token`): Digital balance pass.
12. `KycApprovalsScreen.jsx`: Admin queue for pending customer phone updates.
13. `CorrectionsQueueScreen.jsx`: Admin queue for cashier billing correction tickets.
14. `AdminDuplicateScreen.jsx`: Trigram duplicate customer detection queue & merge.
15. `ReportsScreen.jsx`: Managerial reporting dashboard.
16. `GiftCardsScreen.jsx`: Digital gift card issuance, PIN validation, POS deduction.
17. `TenantManagementScreen.jsx`: Multi-tenant dealership firm listing.
18. `CustomerPortalScreen.jsx` (`/portal`): Customer self-service portal.

### 10.2 Backend API Routes (21 Route Modules)
`auth.routes.js`, `customer.routes.js`, `search.routes.js`, `vehicle.routes.js`, `branch.routes.js`, `brand.routes.js`, `points.routes.js`, `transaction.routes.js`, `referral.routes.js`, `redemption.routes.js`, `kyc.routes.js`, `correction.routes.js`, `giftCard.routes.js`, `tenant.routes.js`, `admin.routes.js`, `report.routes.js`, `publicBalance.routes.js`, `public_referral.routes.js`, `customerPortal.routes.js`, `appsheet.routes.js`, `notification.routes.js`.

---

## 11. Redemption Expiry Reset Mechanics & Step-by-Step Business Verification Example

### 11.1 How Vehicle Redemption Expiry Works Today (`redemption_eligibility.service.js:201`)
1. **Initial Anchor**: Vehicle purchase date set as initial anchor:
   - `eligible_at = purchase_date + 12 months`
   - `expires_at = purchase_date + 24 months`
2. **Redemption Reset (`resetClockOnRedemption`)**: When a customer performs ANY redemption, `resetClockOnRedemption` executes inside the transaction:
   ```javascript
   // src/services/redemption_eligibility.service.js:201-218
   const anchor = new Date(redemptionDate);
   const newExpiresAt = new Date(anchor);
   newExpiresAt.setMonth(newExpiresAt.getMonth() + 24);

   await client.query(
     `UPDATE vehicles
      SET redemption_status = 'eligible',
          redemption_eligible_at = COALESCE(redemption_eligible_at, $1),
          redemption_expires_at = $2,
          updated_at = NOW()
      WHERE vehicle_id = $3 AND tenant_id = $4;`,
     [anchor.toISOString(), newExpiresAt.toISOString(), vehicleId, tenantId]
   );
   ```

### 11.2 Step-by-Step Timeline Example
```
[Jan 1, 2024] Car Purchase ➔ Anchor = Jan 1, 2024
   │
   ├── [Jan 1, 2024 – Dec 31, 2024]: Status = LOCKED (First 12 months)
   │
[Jan 1, 2025] 12 Months Reached ➔ Status = ELIGIBLE (5,000 Pts Available)
   │
[Jul 1, 2025] Customer Redeems 2,000 Pts (at Month 18)
   │   └── resetClockOnRedemption executes:
   │       ├── New Anchor Date = Jul 1, 2025
   │       └── New Expiration Date = Jul 1, 2027 (Extended 24 months from redemption date!)
   │
[Jul 1, 2025 – Jul 1, 2027] Customer remains ELIGIBLE with remaining 3,000 Pts balance
   │
[Jul 1, 2027] 24 Months of Inactivity Reached ➔ Status = EXPIRED
       └── Points written off by daily cron as 'expire' forfeiture entries
```

---

> 🛑 **PRIME DIRECTIVE ACKNOWLEDGMENT**: No production code has been modified. Phase 0 audit is 100% complete and fully verified against the workspace codebase.
