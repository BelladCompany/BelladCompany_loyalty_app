# Automobile Dealership Group Loyalty Program - Backend & POS Counter

Scaffold, REST API, and POS Counter UI for the Automobile Dealership Group Loyalty Program, built strictly according to [PROJECT_BRIEF.md](./PROJECT_BRIEF.md) and [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

---

## 🛠️ Tech Stack & Key Rules

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (with `pg_trgm` extension for fuzzy search)
- **Frontend:** React + Tailwind CSS (Light theme only, high-contrast POS typography, $44\text{px}+$ tap targets)
- **Authentication:** JWT with Role-Based Access Control (`cashier`, `admin`)
- **Core Identity:** `customer_id` is system-generated (`BAC-100001`), immutable, and never derived from phone number or name.
- **Append-only Ledger:** `points_ledger` is strictly append-only (triggers block updates and deletes).
- **Points Formulas:**
  - **Sale:** `points = ex-showroom price / 100` (pre-tax, not on-road price)
  - **Service:** `points = (bill amount / 100) * 4`
  - **Referral (Manual & Approved):** Never auto-calculated. Registered with 0 points; approved manually by an authorized approver from `referral_approvers` with mandatory points and reason.
  - **Conversion (Both Earning & Redeeming):** `4 points = 1 rupee`
- **WhatsApp Notification Service:**
  - Pluggable provider architecture (`BaseWhatsAppProvider` -> `MockWhatsAppProvider`).
  - Triggered asynchronously (non-blocking) on points earning (`sale`, `service`, `referral`).
  - Computes `{total_points}` live from `points_ledger` at send time (never cached) and loyalty value (`total_points / 4`).
  - Formatted using exact template:
    ```text
    🎉 Congratulations!
    You have earned {points} loyalty points from your recent {transaction_type} transaction.
    ⭐ Points earned: {points}
    💰 Total available points: {total_points}
    💵 Loyalty value: ₹{value}
    Thank you for choosing us!
    ```
- **Redemption Rules:**
  - 6-digit OTP hashed with bcrypt, 10-minute expiry, single-use, rate-limited to 5 requests/hour/customer.
  - Lock-in period (default: 365 days) checked against initial earning date.
  - Generates unique redemption code (`RDM-...`) and writes a reversing negative entry to `points_ledger`.
- **Duplicate Customer Resolution:**
  - Flagged candidates detected via phone overlap or high `pg_trgm` name similarity.
  - Admin reviews records side-by-side and executes merge with mandatory reason.
  - Points ledger, phones, and vehicles consolidated under surviving master ID.
  - Non-surviving customer marked `is_merged = TRUE` (never deleted) and logged in `customer_merge_log`.
- **RealBooks REST API Integration & Retry Worker:**
  - Completed redemptions trigger an asynchronous push to RealBooks REST API (`REALBOOKS_API_URL`).
  - Attempts are logged in `realbooks_sync_log` (`pending`, `synced`, `failed`) with full `request_payload` and `response_payload`.
  - Failures trigger an exponential backoff schedule: $\text{delaySeconds} = \min(3600, 30 \times 2^{\text{retryCount}})$.
  - Periodic background retry worker processes eligible failed sync logs.
  - Admin endpoints (`GET /api/admin/realbooks/sync-failures` and `POST /api/admin/realbooks/retry/:id`) allow inspection and manual retries.

---

## 📂 Project Structure

```
├── client/                     # React + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/      # Customer 360, EarnPointsModal, RedemptionModal
│   │   │   ├── layout/         # SidebarLayout with role-based visibility
│   │   │   └── ui/             # Button, Input, DataTable, StatusBadge, ConfirmationModal
│   │   ├── screens/            # LoginScreen, CashierDashboard, AdminDuplicateScreen
│   │   └── services/           # ApiService client
├── src/                        # Express + PostgreSQL Backend
│   ├── app.js
│   ├── index.js
│   ├── config/                 # Database pool & environment variables
│   ├── controllers/            # Auth, Customer, Search, Points, Referral, Redemption, Admin
│   ├── db/
│   │   ├── migrate.js          # Migration runner
│   │   ├── seed.js             # Initial database seeder
│   │   └── migrations/         # 001 through 005 SQL migrations
│   ├── middleware/             # Auth JWT, Role RBAC, Zod Validation, Error Handler
│   ├── routes/                 # Express API routes
│   ├── services/               # Core business services & NotificationService
│   │   └── whatsapp/           # Pluggable WhatsApp provider interface & mock implementation
│   └── validators/             # Zod validation schemas
├── DESIGN_SYSTEM.md            # POS Counter Design System specification
├── PROJECT_BRIEF.md            # Master business rules and specifications
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (v14+)

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

### 3. Run Backend Migrations & Seed
```bash
npm install
npm run migrate
npm run seed
```

### 4. Start Development Servers
- **Backend Server (port 5000):**
  ```bash
  npm run dev
  ```
- **Frontend Counter UI (port 3000):**
  ```bash
  cd client
  npm install
  npm run dev
  ```

---

## 🔒 User Accounts

- **Cashier Terminal User:** `username: cashier`, `password: Cashier@123`
- **Admin Manager User:** `username: admin`, `password: Admin@123`

> **⚠️ Demo credentials only.** These are seeded for local development. Change the admin/cashier passwords (and username) before any production deployment.

---

## ✅ Production Deployment Checklist

Use this checklist before deploying anywhere outside local development.

### HTTPS Enforcement
- [ ] Terminate TLS at the reverse proxy (Nginx / Caddy / ALB) and forward only `https` to the Node.js app.
- [ ] Set `trust proxy` correctly behind the proxy (reverse proxy sets `X-Forwarded-For`) so `req.ip` in the login rate limiter is the real client IP. **Do not set `trust proxy` on a directly-exposed server.**
- [ ] Redirect all `http://` traffic to `https://` (301) in the proxy config.
- [ ] Enable HSTS via the reverse proxy or Helmet's `strictTransportSecurity`:
  ```js
  app.use(helmet({ strictTransportSecurity: { maxAge: 15552000, includeSubDomains: true } }));
  ```
- [ ] Verify `helmet()` headers on every response, including `/health`.
- [ ] Use a valid certificate from a trusted CA (Let's Encrypt or commercial). No self-signed certs in production.
- [ ] Set `NODE_ENV=production` so Express disables error stack traces and development-only behaviors.
- [ ] Restrict CORS `app.use(cors())` to the exact frontend origin(s); do not allow `*`:
  ```js
  app.use(cors({ origin: ['https://pos.example.com'], credentials: true }));
  ```

### Environment Variable Hygiene
- [ ] Never commit `.env` to version control. Keep only `.env.example` (with placeholders) in the repo.
- [ ] `JWT_SECRET` must be a long, random, unique value per environment. Generate with `openssl rand -base64 48`. Never reuse the same secret across staging/production.
- [ ] `DB_PASSWORD` / `DATABASE_URL` must be a real, non-default credential. The app **refuses to start in production** with the default `postgres` password (see `src/config/env.js`).
- [ ] `REALBOOKS_API_KEY` must be a real key. The mock client is used while unset — startup warns in production.
- [ ] Rotate all secrets immediately if a default/demo value (`super_secret_jwt_key_change_in_production`, `rb_live_demo_key`, `postgres`, `Admin@123`, `Cashier@123`) has ever been used.
- [ ] Use a secret manager (AWS Secrets Manager / Vault / env-injected secrets) — never hardcode secrets in code or Docker images.
- [ ] Run a nightly/CI secrets scan (e.g. `gitleaks`, `trufflehog`) on the repository.
- [ ] Keep `JWT_EXPIRES_IN` short (≤ 24h) in production.

### Application Hardening (already present — verify at deploy)
- [ ] Login endpoint is rate-limited per IP + username (10 attempts / 15 min window).
- [ ] OTP redemption flow is rate-limited to 5 requests/hour/customer with lockout after failed attempts.
- [ ] All SQL is parameterized (no string-concatenated user input).
- [ ] Every API route (except `/health` and `/api/auth/login`) requires a valid JWT and role check.
- [ ] `points_ledger` stays strictly append-only (database trigger blocks updates/deletes).
- [ ] Every points adjustment, merge, and redemption writes a row to `audit_log` with before/after values, actor `user_id`, and timestamp.
- [ ] `customer_id` never derived from phone/name; phone numbers never used as a primary key.
- [ ] Change or disable the seeded demo users (`admin`, `cashier`) before going live.
