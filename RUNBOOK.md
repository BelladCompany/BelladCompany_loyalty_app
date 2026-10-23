# OPERATIONS RUNBOOK: WHITE-LABEL LOYALTY PLATFORM & STUDIO
**Version:** 2.0.0-ENTERPRISE  
**Standard:** Enterprise International Grade (Stripe/Linear Standard)  
**Scope:** Production Deployment, Zero-Downtime Migration, Real-Time Rollback, Ledger Disaster Recovery, and DPDP Compliance

---

## 1. Production Architecture Overview

```
                      [Cloudflare / Edge CDN]
                                 │
                  ┌──────────────┴──────────────┐
                  ▼                             ▼
       [Backend Node.js API]          [Vite Frontend PWA / Studio]
        (Port 5000 / Stateless)        (Port 5173 or Vercel/Nginx)
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
 [PostgreSQL 14+ Primary]   [In-Memory LRU Cache]
 (Append-Only Ledger + RLS) (Invalidated on PG NOTIFY)
```

---

## 2. Zero-Downtime Deployment Procedure

### 2.1 Pre-Flight Verification
Run all automated test suites to ensure 100% test pass rate:
```bash
# 1. Verify all migrations in dry-run mode (syntactical & transactional rollback)
npm run migrate:dry-run

# 2. Run the complete Enterprise Test Suite
node platform/__tests__/run-all.js

# 3. Build frontend bundle
cd client && npm run build && cd ..
```

### 2.2 Applying Database Migrations
Database migrations are strictly additive and backward-compatible:
```bash
npm run migrate
```
Migration `040_white_label_platform_core.sql` creates:
- `tenant_loyalty_rule_versions` (stores immutable JSON schema rulesets).
- `tenant_branding_configs` (stores per-tenant themes, logos, and i18n preferences).
- `tenant_rule_audit_trail` (tracks who changed what, when, and version diffs).
- Seeded `bellad_and_company` Version 1 as active published baseline.
- `trg_notify_rule_published` PostgreSQL NOTIFY trigger.

### 2.3 Starting Services
```bash
# Production server start
NODE_ENV=production npm start
```

---

## 3. Real-Time Publish & Instant Rollback Runbook

### 3.1 Publishing Rules Live (< 1 Second)
1. **Via Admin Studio UI**:
   - Navigate to `/editor` or click **Rules Studio V2** in the dashboard.
   - Edit conditions, discounts, or points formulas.
   - Click **Save Draft** $\rightarrow$ Click **Publish Live (<1s)**.
2. **Via REST API**:
   ```bash
   curl -X POST https://api.yourdomain.com/api/v1/platform/rules/publish \
     -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"version_number": 2, "tenant_id": "bellad_and_company"}'
   ```
3. **What Happens Under the Hood**:
   - Target version is promoted to `status = 'published'`, `is_active = true`.
   - Previous active version is demoted to `'archived'`.
   - PostgreSQL executes `NOTIFY loyalty_rule_published, '{"tenant_id": "...", "version_number": 2}'`.
   - Backend in-memory LRU caches invalidate in $<10\text{ ms}$.
   - Connected browser clients receive push via SSE stream `/api/v1/platform/rules/stream` in $<400\text{ ms}$.

### 3.2 One-Click Rollback Flow
If an unintended rule was published, execute an instant rollback:
1. **Via UI**:
   - In Rules Studio V2, open the **Version History** panel on the bottom left.
   - Click **Rollback** on any previous version (e.g., Version 1 Baseline).
2. **Via REST API**:
   ```bash
   curl -X POST https://api.yourdomain.com/api/v1/platform/rules/rollback \
     -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"target_version_number": 1, "tenant_id": "bellad_and_company"}'
   ```
3. **Rollback Guarantee**:
   - Rollback is non-destructive. It copies the historical ruleset into a newly published version bump ($N+1$).
   - Immediately dispatches `NOTIFY` and restores baseline rates across all counter terminals.

---

## 4. Financial-Grade Points Ledger Operations

### 4.1 Append-Only Ledger Guarantee
- `UPDATE` and `DELETE` queries on `points_ledger` are **blocked by database trigger** `trg_prevent_points_ledger_modification`.
- **Never attempt raw SQL updates or deletes on ledger rows.**

### 4.2 Handling Billing Corrections & Disputes
To correct points for a customer or vehicle:
- Use `PlatformLedgerService.recordCompensatingAdjustment(...)` or `POST /api/v1/corrections`.
- Writes an audit-stamped compensating entry (`type = 'adjust'`, `transaction_category = 'adjust'`) referencing the original transaction with mandatory authorization notes.

### 4.3 Daily Reconciliation Job
Run the automated ledger reconciliation worker daily at 02:00 AM IST:
```bash
node -r dotenv/config -e "
  const PlatformLedgerService = require('./platform/ledger/ledger.service');
  PlatformLedgerService.reconcileCustomerBalances('bellad_and_company')
    .then(r => console.log('Reconciliation complete. Customers verified:', r.length))
    .catch(console.error);
"
```

---

## 5. Security & DPDP Act Compliance Runbook

1. **Aadhaar Data Minimization**:
   - Never log or store raw 12-digit Aadhaar numbers in plain text.
   - Store only salted HMAC-SHA256 hash (`aadhaar_hash`) for deduplication and AES-256-GCM encrypted last-4 digits (`aadhaar_last4_enc`) for UI masked display (`XXXXXXXX1234`).
2. **Customer Consent & Data Erasure (Right to be Forgotten)**:
   - When a customer requests account deletion under DPDP regulations:
   - Soft-delete customer PII (`status = 'archived'`, anonymize name and phone).
   - Retain immutable financial transaction records in `points_ledger` for mandatory statutory tax auditing (7 years).
3. **Rate Limiting & Abuse Prevention**:
   - OTP Generation: Maximum 5 requests per hour per customer/phone.
   - Login: 10 attempts per 15 minutes per IP.
   - Public balance pass: 30 requests per minute.

---

## 6. Observability & Health Check Endpoints

| Endpoint | Protocol | Expected Response | Description |
| :--- | :---: | :---: | :--- |
| `GET /health` | HTTP | `{"ok": true}` | Lightweight load-balancer health check |
| `GET /api/v1/platform/rules/active` | HTTP | `200 OK` + `ETag` | Verifies ruleset cache availability |
| `GET /api/v1/platform/rules/stream` | SSE | `data: {"type": "CONNECTED"}` | Real-time push stream listener |

---

## 7. Emergency Contacts & Escalation Matrix

- **Principal Architect**: Lead Engineering Team (`eng@bellad.co`)
- **Operations & DBA**: DevOps On-Call (`ops@bellad.co`)
- **Executive Oversight**: Agastya Bellad / Director Desk (`executive@bellad.co`)

---

## 8. Customer Gifting System (WhatsApp e-Gift Cards)

### Business Rules & Flow
1. **Funding Sources**:
   - **Mode A (Loyalty Points)**: Sender shares points (4 PTS = ₹1). Points are immediately debited from sender's ledger (`type: 'redeem'`). Minimum ₹100 (400 PTS), Maximum ₹25,000.
   - **Mode B (Razorpay Payment)**: Sender buys a gift voucher by paying via Razorpay. Receiver gets 4 PTS per ₹1.
2. **Sharing**:
   - Generates unique secure claim link: `https://<domain>/gift/<32_byte_token>` (stored as SHA-256 hash).
   - One-click "Share via WhatsApp" pre-fills greeting and link.
3. **Strict "New Customers Only" Rule**:
   - When receiver opens link and enters mobile number, system verifies whether they have ever purchased a vehicle from Bellad (`vehicles` table + DMS records).
   - If receiver is an **existing vehicle buyer**, the claim is **rejected**, and points/funds are **automatically refunded** back to the sender.
   - If receiver is a **genuine new customer**, points are credited to their wallet (valid for 12 months) and a new guest profile is enrolled.
4. **Automated Expiry**:
   - Unclaimed links expire after 30 days. Background worker (`startGiftExpiryCron`) runs every 1 hour and reverts expired gifts to the sender.
5. **Testing**:
   ```bash
   node scripts/test-gift-system.js
   ```
