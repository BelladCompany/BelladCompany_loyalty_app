# Project Context: Multi-Tenant Loyalty App Builder Platform (SaaS)

## 1. Product Vision
A multi-tenant, no-code / low-code SaaS platform (similar to WordPress + Elementor + Retool + a native Loyalty Rules Engine) engineered to build, customize, and deploy complete loyalty applications across India for automobile dealerships and enterprise retail networks.
The platform enables company admins to start from a **Blank Canvas** or pre-configured industry templates (such as the Bellad & Company Automotive Loyalty template), allowing full visual control over fields, screens, role-based workflows, rules, notifications, and branding without writing code.

---

## 2. The Golden Rules (Strict Architectural Principles)
1. **Nothing is Hard-Coded:** Every screen, component, field, label, color, font, role, permission, rule, workflow, message template, and navigation item is stored as configuration (JSON) in the database and rendered dynamically.
2. **Multi-Tenant from Day One:** Every table has a `tenant_id`. Strict row-level isolation and schema enforcement in the backend. Zero cross-tenant data leaks.
3. **Three Distinct Layers:**
   * **Builder Studio:** Visual drag-and-drop workspace where company admins design and configure apps.
   * **Runtime Application:** Live, performant apps used by Customers, Cashiers, and Managers, rendered from published JSON configurations.
   * **Platform Admin:** Master Super-Admin control center to manage all tenant organizations, subscription plans, resource limits, and global templates.
4. **100% No-Code Editable:** Drag-and-drop canvas, visual property panels, dropdowns, and toggles for non-technical admins.
5. **Configuration Versioning & Rollback:** Draft vs. Published versions with visual preview, one-click publish, rollback, and revision history.
6. **API-First Architecture:** Every capability accessible via documented RESTful APIs with tenant-scoped API keys and rate limiting.
7. **Mobile-First & PWA:** Installable Customer PWA, cashier interfaces optimized for mobile phones and low-end POS hardware.
8. **India-Ready Localization:** INR (₹) currency formatting, GST invoice inputs, +91 mobile OTP authentication, Indian date formats (DD/MM/YYYY), multi-language support (English, Hindi, Kannada, Marathi, Tamil, Telugu), and WhatsApp/SMS gateway integrations.
9. **Production Quality:** TypeScript, schema validation (Zod/class-validator), error handling, loading/empty states, automated test suites, and zero mock or fake data in production code.

---

## 3. Technology Stack & Architecture
* **Frontend:** Next.js (App Router) / React, TypeScript, Tailwind CSS, `@dnd-kit` for drag-and-drop visual composition, Zustand for editor state management.
* **Backend:** Node.js (NestJS / Express / Next.js API Routes), PostgreSQL with Row-Level Security (RLS), Prisma ORM / pg connection pooling, Redis for caching, BullMQ for asynchronous workflows and notifications.
* **Infrastructure:** Vercel / Docker containerization, managed PostgreSQL (Neon / Supabase), S3-compatible object storage for media and logos.
* **Reference Application:** Bellad & Company Loyalty Platform (BAC Loyalty) live at `https://bellad-company-loyalty-app-murex.vercel.app/`.

---

## 4. 14 Implementation Modules in Sequential Order
1. **Module 1: Architecture and Multi-Tenancy** (Data isolation, tenant resolution, database migrations, base tenant schemas)
2. **Module 2: Auth, Users, and Role-Based Access Control** (Phone OTP, staff roles: Cashier, Manager, Admin, Director, Customer)
3. **Module 3: Dynamic Data Model and Custom Fields** (Dynamic entity schemas, custom customer & invoice attributes)
4. **Module 4: Loyalty Rules & Points Engine** (Earning %, burn caps, lock-in, expiry FIFO, priority tiers, conversions)
5. **Module 5: Visual Page Builder & Canvas Engine** (Drag-and-drop blocks, canvas grid, component tree, property inspector)
6. **Module 6: Theme & White-Label Customizer** (Logo uploader, color palettes, typography, custom domains)
7. **Module 7: Workflow Automation & Approvals** (Bill correction queue, KYC approval workflows, manager triggers)
8. **Module 8: Runtime Cashier Module** (Customer search, bill entry, discount voucher redemption, WhatsApp pass)
9. **Module 9: Runtime Customer App (PWA)** (Digital pass, points ledger, offers catalog, referral claim)
10. **Module 10: Manager Dashboard & Executive Reports** (Radial gauges, footfall, burn trends, department breakdowns)
11. **Module 11: Notifications & India-Ready Localization** (WhatsApp WABA, SMS gateways, GST fields, multi-language)
12. **Module 12: Templates & Dealership Cloning** (Bellad automotive template, blank canvas, 1-click clone)
13. **Module 13: Tenant Billing, Subscriptions & Custom Domains** (SaaS tiers, plan limits, custom CNAME routing)
14. **Module 14: Platform Security, Audit Logging & Comprehensive QA** (Audit trails, regression suites, load testing)

---

## 5. Working Rules
* Keep `/docs/PROGRESS.md` updated after completing each module.
* Before coding any module, present a concise implementation plan (data models, APIs, screens, edge cases) and await user confirmation.
* Deliver complete, runnable vertical slices with zero unfinished placeholders or broken builds.

