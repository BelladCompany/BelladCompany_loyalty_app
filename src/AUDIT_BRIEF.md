# Loyalty App — Audit Brief for Claude Code

You are auditing a Node/Express + Postgres + React(Vite) car-dealership loyalty app
(multi-branch, multi-brand: Tata, Ather, MG, CNH etc). Some features were already
attempted by another AI tool (Antigravity) and may be partial or broken.

## Your task
1. Read the actual current codebase in this folder (not any summary) — schema in
   `src/db/migrations/`, services in `src/services/`, routes in `src/routes/`,
   client in `client/src/screens/`.
2. Run the app locally (backend + DB migrations + frontend) and actually exercise
   each flow below, not just read code.
3. Produce a gap-analysis table: Requirement | Status (Done/Partial/Missing/Broken) |
   File(s) | Notes/fix needed.

## Known confirmed bug (reproduce first)
Redemption flow throws: `new row for relation "points_ledger" violates check
constraint "points_ledger_transaction_category_check"`. Cause: a
`transaction_category` CHECK constraint was added restricted to
('service','sale','accessory','bodyshop'), but redemption/referral/adjustment
ledger inserts don't set this column — it should be nullable and only required
for earning-type rows. Confirm this, find every `INSERT INTO points_ledger` and
fix each one.

## Requirements checklist to verify

**Core (owner's original list):**
1. Sale and service points auto-calculated server-side from bill amount — NOT
   manually entered/computed by cashier. Cashier should not be able to influence
   the point math.
2. Phone-number change for an existing customer requires: reason (mandatory),
   ID proof upload, and manager/admin approval before it takes effect. Must not
   be a simple self-service edit.
3. Four transaction categories exist and are used consistently: service, sale,
   accessory, bodyshop.
4. Case sensitivity: phone numbers, vehicle registration numbers, emails,
   usernames must be treated case-insensitively (no duplicate customers/vehicles
   from casing differences).
5. No manual point-entry path exists anywhere that bypasses server-side calculation.
6. UI/UX: professional design (not generic AI-default look), working filters,
   import/export (CSV), branch+brand+model based views (e.g. "Hubli branch
   customer count" should be a simple filtered view).
7. Every transaction/billing event is stored in the DB permanently, retrievable
   later (audit trail).
8. Manager reporting exists: branch-wise, brand-wise, model-wise, category-wise
   reports, exportable.
9. Ex-showroom price (sale) and bill amount (service) are never manually typed
   by cashier for the purpose of point calculation — auto-fetched or entered once
   as raw bill data, all point/discount math computed server-side only.
10. Nominee feature: customer can register a nominee and transfer points to them.
11. WhatsApp message to customer includes a link to a simple public webpage
    showing their points balance and discount value (must not expose phone/
    full name/address — privacy-safe token-based link, not guessable).
12. Job card number is a required, unique (per branch+tenant) field on service
    transactions — prevents duplicate billing/double point credit.
13. Referral tab uses the slab-based table (attached separately) to auto-suggest
    referral points by vehicle price range (4W and 2W categories), while still
    requiring human approver sign-off (don't fully automate away the fraud check).

**Senior-dev risk items (verify these too, even if not explicitly requested):**
- RealBooks integration (`src/services/realbooks/`) — currently a MOCK that
  always returns fake success. Confirm whether this is still fake or was
  connected to something real; report actual status either way.
- Idempotency: can the same bill/job-card number be submitted twice and create
  duplicate points? Test this explicitly.
- Branch-level RBAC: can a branch_manager/cashier see or act on another
  branch's customers/approvals? Should not be able to.
- Points liability / expiry: does the 12–24 month redemption eligibility window
  (migration 009) actually block/allow redemption correctly at each stage?
- Rate limiting on OTP and on KYC-change requests.
- DPDP/privacy: is ID-proof file storage handled with any access control, or
  world-readable?

## Output format
A markdown table, one row per requirement/item above, plus a separate short
list of "critical bugs found while testing" (things that error out, not just
missing features). Do not fix anything yet unless I ask — audit first, report,
then we'll fix in priority order.
