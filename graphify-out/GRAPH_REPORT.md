# Graph Report - final-loyaly-app-nov  (2026-11-24)

## Corpus Check
- 394 files · ~338,081 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 9, .example 2, .conf 1)

## Summary
- 2304 nodes · 4538 edges · 129 communities (94 shown, 35 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `448b9bd8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ApiService
- db.js
- react
- invoiceV2.controller.js
- customer.service.js
- IntegrationController
- environment
- rules.controller.js
- App.jsx
- containers
- spec
- schemas.js
- client/package.json
- containers
- Automobile Dealership Loyalty Program — Design System
- rateLimiter.js
- App
- ReferralService
- package.json
- rateLimiter.js
- integration.service.js
- containers
- annotations
- scopeBranchAccess
- app.js
- CampaignEngineService
- brand.routes.js
- hashIdentifier
- SYSTEM AUDIT & ARCHITECTURE SPECIFICATION (PHASE 0 - REVISED & EXPANDED)
- data
- RealBooksService
- NetworkPolicy database-isolation-policy
- MULTI-TENANT SAAS ARCHITECTURE & IMPLEMENTATION SPECIFICATION (PHASE 1 - REVISED)
- src/index.js
- AdminController
- MasterEditorController
- api.test.js
- Bellad & Co. Dealership Loyalty & Rewards Platform
- services
- StandaloneMasterEditorPortal
- env.js
- KycController
- ports
- ports
- AddReceiptModal
- CorrectionService
- copy-data.js
- PortalDashboardScreen.jsx
- NotificationService
- pg
- RealBooks Integration Explained Simply: Complete Non-Technical Guide
- PodDisruptionBudget backend-pdb
- Bellad & Co Loyalty Platform - Enterprise Kubernetes Architecture & Deployment Guide
- publicBalance.service.js
- auth.js
- reltigrow.provider.js
- containers
- whatsapp.provider.js
- labels
- SearchService
- AppSheetSyncEngine
- appsheet.routes.js
- containers
- initContainers
- scripts
- create-before-gst-backup.js
- db-backup.js
- RedemptionEligibilityService
- import.routes.js
- run-migration-012.js
- labels
- PersistentVolumeClaim postgres-pvc
- Service postgres-service
- spec
- kustomization.yaml
- invoiceV2.controller.js
- TenantController
- PersistentVolumeClaim postgres-pvc
- Skeleton.jsx
- run-migration-019.js
- OfferService
- ErrorBoundary
- Project Context: Multi-Tenant Loyalty App Builder Platform (SaaS)
- spec
- labels
- RealBooksClient
- VehicleController
- engines
- ref_path
- template
- livenessProbe
- readinessProbe
- PlatformLedgerService
- app.js
- Loyalty App — Audit Brief for Claude Code
- BranchController
- run_migration_074.js
- kyc.service.js
- BuilderErrorBoundary
- fix-login.js
- strategy
- ref_fs
- apply-bellad-branches.js
- run-migrations-010-011.js
- reset-render.js
- vercel.json
- CashierDashboard
- startupProbe
- appsheet.js
- correction.routes.js
- NotificationController
- baseline-migrations.js
- sync-columns.js
- .getCustomerById
- client/vercel.json
- compare-counts.js
- SaaS Loyalty App Builder: Implementation Progress
- api.test.js
- _tmp_schema.js
- deploy.sh script

## God Nodes (most connected - your core abstractions)
1. `ApiService` - 208 edges
2. `{ Pool }` - 122 edges
3. `react` - 57 edges
4. `lucide-react` - 48 edges
5. `App()` - 34 edges
6. `express` - 33 edges
7. `NotificationService` - 31 edges
8. `MasterEditorController` - 30 edges
9. `ReferralService` - 29 edges
10. `authenticateToken()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `9.1 Customer Merge Mechanics (`merge.service.js:203`)` --references--> `MergeService`  [INFERRED]
  AUDIT.md → src/services/merge.service.js
- `5. Existing Data Reconciliation Audit (A3 Findings)` --references--> `VehicleSalesPointsService`  [INFERRED]
  AUDIT.md → src/services/vehicleSalesPoints.service.js
- `7.1 `SidebarLayout`` --references--> `SidebarLayout()`  [INFERRED]
  DESIGN_SYSTEM.md → client/src/components/layout/SidebarLayout.jsx
- `3. Complete Page & Screen Directory` --references--> `PortalDashboardScreen()`  [INFERRED]
  PROJECT_COMPLETE_ARCHITECTURE_AND_LOGIC_GUIDE.md → client/src/components/portal/PortalDashboardScreen.jsx
- `7.2 `Button`` --references--> `Button()`  [INFERRED]
  DESIGN_SYSTEM.md → client/src/components/ui/Button.jsx

## Import Cycles
- 2-file cycle: `src/services/customer.service.js -> src/services/notification.service.js -> src/services/customer.service.js`
- 2-file cycle: `src/services/appsheetPull.service.js -> src/services/customer.service.js -> src/services/appsheetPull.service.js`
- 2-file cycle: `src/services/whatsapp/reltigrow.provider.js -> src/services/whatsapp/whatsapp.provider.js -> src/services/whatsapp/reltigrow.provider.js`
- 3-file cycle: `src/services/customer.service.js -> src/services/transaction.service.js -> src/services/referral.service.js -> src/services/customer.service.js`
- 4-file cycle: `src/services/customer.service.js -> src/services/transaction.service.js -> src/services/vehicleSalesPoints.service.js -> src/services/notification.service.js -> src/services/customer.service.js`
- 4-file cycle: `src/services/appsheetPull.service.js -> src/services/points.service.js -> src/services/notification.service.js -> src/services/customer.service.js -> src/services/appsheetPull.service.js`
- 4-file cycle: `src/services/customer.service.js -> src/services/transaction.service.js -> src/services/points.service.js -> src/services/notification.service.js -> src/services/customer.service.js`
- 4-file cycle: `src/services/customer.service.js -> src/services/transaction.service.js -> src/services/referral.service.js -> src/services/notification.service.js -> src/services/customer.service.js`
- 4-file cycle: `src/services/appsheetPull.service.js -> src/services/transaction.service.js -> src/services/referral.service.js -> src/services/customer.service.js -> src/services/appsheetPull.service.js`
- 5-file cycle: `src/services/appsheetPull.service.js -> src/services/transaction.service.js -> src/services/vehicleSalesPoints.service.js -> src/services/notification.service.js -> src/services/customer.service.js -> src/services/appsheetPull.service.js`
- 5-file cycle: `src/services/appsheetPull.service.js -> src/services/transaction.service.js -> src/services/points.service.js -> src/services/notification.service.js -> src/services/customer.service.js -> src/services/appsheetPull.service.js`
- 5-file cycle: `src/services/appsheetPull.service.js -> src/services/transaction.service.js -> src/services/referral.service.js -> src/services/notification.service.js -> src/services/customer.service.js -> src/services/appsheetPull.service.js`

## Communities (129 total, 35 thin omitted)

### Community 0 - "ApiService"
Cohesion: 0.03
Nodes (9): EarnPointsModal(), PortalDashboardScreen(), SendGiftModal(), RulesStudio(), CampaignScreen(), PublicGiftClaimScreen(), PublicReferralLeadScreen(), ReferralsScreen() (+1 more)

### Community 1 - "db.js"
Cohesion: 0.04
Nodes (16): bcrypt, assert, parseDateRobust(), runRepair(), DUMMY_MODELS, parseDmsDate(), updatePurchaseDates(), bcrypt (+8 more)

### Community 2 - "react"
Cohesion: 0.08
Nodes (31): RaiseCorrectionModal(), RequestKycModal(), DICTIONARY, Button(), ConfirmationModal(), CopyButton(), CustomerSummaryCard(), DataTable() (+23 more)

### Community 3 - "invoiceV2.controller.js"
Cohesion: 0.15
Nodes (13): addToAdvisorQueue(), detectBrandAndFormat(), extractTextFromPdf(), fs, normalizeRegNo(), parseGenericInvoice(), parseHeroInvoice(), parseHyundaiInvoice() (+5 more)

### Community 4 - "customer.service.js"
Cohesion: 0.07
Nodes (15): 3. Exhaustive Loophole & Security Vulnerability Audit (LOOP-01 to LOOP-25), bcryptjs, bcrypt, testReferralFlow(), CustomerController, bcrypt, jwt, express (+7 more)

### Community 5 - "IntegrationController"
Cohesion: 0.09
Nodes (6): IntegrationController, authenticateApiKey(), requireScope(), express, router, IntegrationService

### Community 6 - "environment"
Cohesion: 0.04
Nodes (47): build, command, container_name, depends_on, environment, networks, ports, restart (+39 more)

### Community 7 - "rules.controller.js"
Cohesion: 0.07
Nodes (21): crypto, PlatformRulesController, calculateNetSalesBasePaise(), evaluateRules(), EXCLUDED_CATEGORIES, isExcludedCategory(), matchRule(), normalizeStr() (+13 more)

### Community 8 - "App.jsx"
Cohesion: 0.18
Nodes (16): BranchNetworkChart(), DistributionPieChart(), SidebarLayout(), APP_VERSIONS, getAppVersion(), isFeatureEnabled(), isUserAdmin(), setAppVersion() (+8 more)

### Community 9 - "containers"
Cohesion: 0.05
Nodes (41): apiVersion, image, imagePullPolicy, livenessProbe, name, ports, readinessProbe, resources (+33 more)

### Community 10 - "spec"
Cohesion: 0.06
Nodes (39): scaleDown, scaleUp, HorizontalPodAutoscaler backend-hpa, HorizontalPodAutoscaler frontend-hpa, apiVersion, kind, metadata, spec (+31 more)

### Community 11 - "schemas.js"
Cohesion: 0.07
Nodes (36): validate(), { ZodError }, express, router, express, router, express, router (+28 more)

### Community 12 - "client/package.json"
Cohesion: 0.07
Nodes (37): dependencies, clsx@^2.1.1, lucide-react@^0.395.0, react@^18.3.1, react-dom@^18.3.1, tailwind-merge@^2.3.0, xlsx@^0.18.5, devDependencies (+29 more)

### Community 13 - "containers"
Cohesion: 0.06
Nodes (38): command, image, imagePullPolicy, livenessProbe, name, ports, readinessProbe, resources (+30 more)

### Community 14 - "Automobile Dealership Loyalty Program — Design System"
Cohesion: 0.05
Nodes (35): 1.1 Action Colors, 1.2 Surface Colors, 1.3 Text (Ink) Colors, 1.4 Sidebar Colors, 1. Color Palette — Light Theme Only, 2.1 Scale, 2. Typography, 3. Spacing Scale (+27 more)

### Community 15 - "rateLimiter.js"
Cohesion: 0.09
Nodes (20): giftCardRateLimiter(), otpRequestRateLimiter(), otpVerifyRateLimiter(), fs, multer, path, storage, uploadDir (+12 more)

### Community 16 - "App"
Cohesion: 0.13
Nodes (10): App(), CustomerPortalScreen(), ALL_DEALERSHIP_BRANCHES, ALL_DEALERSHIP_BRANDS, BRAND_ICONS, PublicOffersScreen(), GiftCardsScreen(), LoginScreen() (+2 more)

### Community 17 - "ReferralService"
Cohesion: 0.05
Nodes (8): testPhase4ReferralSlabs(), runTest(), testReferralWhatsAppFlow(), CustomerPortalController, GiftCardController, ReferralController, GiftCardService, ReferralService

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (28): author, dependencies, bcryptjs@^2.4.3, cors@^2.8.5, dotenv@^16.4.5, express@^4.19.2, helmet@^7.1.0, jsonwebtoken@^9.0.2 (+20 more)

### Community 19 - "rateLimiter.js"
Cohesion: 0.10
Nodes (19): appsheetIpRequestCounts, giftCardRequestCounts, globalApiRateLimiter(), globalApiRequestCounts, ipRequestCounts, kycRateLimiter(), loginIpRequestCounts, otpRequestCounts (+11 more)

### Community 20 - "integration.service.js"
Cohesion: 0.06
Nodes (17): main(), assert, fixAndVerify(), recalculateAllVehicleSales(), assert, testPhase2(), assert, runVerification() (+9 more)

### Community 21 - "containers"
Cohesion: 0.07
Nodes (28): apiVersion, command, envFrom, image, imagePullPolicy, name, resources, command (+20 more)

### Community 22 - "annotations"
Cohesion: 0.07
Nodes (27): cert-manager.io/cluster-issuer, kubernetes.io/ingress.class, nginx.ingress.kubernetes.io/proxy-body-size, nginx.ingress.kubernetes.io/proxy-read-timeout, nginx.ingress.kubernetes.io/proxy-send-timeout, nginx.ingress.kubernetes.io/ssl-redirect, nginx.ingress.kubernetes.io/websocket-services, apiVersion (+19 more)

### Community 23 - "scopeBranchAccess"
Cohesion: 0.15
Nodes (7): testPhase6Reports(), DirectorController, ReportController, isAdminOrDirector(), scopeBranchAccess(), DirectorService, ReportService

### Community 24 - "app.js"
Cohesion: 0.11
Nodes (22): express, router, express, authenticateToken(), requireRole(), express, router, express (+14 more)

### Community 25 - "CampaignEngineService"
Cohesion: 0.19
Nodes (4): seed(), runCampaignSuite(), CampaignController, CampaignEngineService

### Community 26 - "brand.routes.js"
Cohesion: 0.18
Nodes (5): BrandController, express, router, createBrandSchema, updateBrandSchema

### Community 27 - "hashIdentifier"
Cohesion: 0.16
Nodes (13): fetchAppSheetPRDoneRows(), parseDmsDate(), wipeAndSync(), seedRahulSharma(), bcrypt, seed(), xlsx, crypto (+5 more)

### Community 28 - "SYSTEM AUDIT & ARCHITECTURE SPECIFICATION (PHASE 0 - REVISED & EXPANDED)"
Cohesion: 0.07
Nodes (26): 10.1 Frontend Screens (18 Screens), 10.2 Backend API Routes (21 Route Modules), 10. Existing Features Inventory (18 Screens & 21 API Route Modules), 11.1 How Vehicle Redemption Expiry Works Today (`redemption_eligibility.service.js:201`), 11.2 Step-by-Step Timeline Example, 11. Redemption Expiry Reset Mechanics & Step-by-Step Business Verification Example, 1. System Overview & Technology Stack, 2. Exhaustive Hardcoded Business Values & Config Mapping (+18 more)

### Community 29 - "data"
Cohesion: 0.08
Nodes (23): apiVersion, data, DB_SSL, DEFAULT_TENANT_ID, ENABLE_DEBUG_OTP, FRONTEND_URL, LOG_LEVEL, NODE_ENV (+15 more)

### Community 30 - "RealBooksService"
Cohesion: 0.08
Nodes (15): bcrypt, fs, path, assert, runTests(), runTests(), testDatabaseTransaction(), verifyAll() (+7 more)

### Community 31 - "NetworkPolicy database-isolation-policy"
Cohesion: 0.11
Nodes (22): NetworkPolicy database-isolation-policy, NetworkPolicy redis-isolation-policy, podSelector, from, ports, app, name, namespace (+14 more)

### Community 32 - "MULTI-TENANT SAAS ARCHITECTURE & IMPLEMENTATION SPECIFICATION (PHASE 1 - REVISED)"
Cohesion: 0.09
Nodes (22): 10. Provisioning, Privacy & Aadhaar Compliance (Fixing B14, B15, LOOP-25), 11.1 Golden Test Suite & Baseline Capture (B17), 11.2 Phased Rollout Schedule (B16), 11. Testing, Rollout & Phased Timeline (Fixing B16, B17), 12. Business Decisions Summary Table (Section C), 1.1 Complete Rule Categories & Constant Mapping Table (Fixing B1), 1.2 Comprehensive Schema SQL Definition (Fixing B2, B3, B4, B7, B8), 1. Complete Schema Changes & Migration Strategy (Fixing B1, B2, B3, B4, B7, B8) (+14 more)

### Community 33 - "src/index.js"
Cohesion: 0.06
Nodes (29): 1. Production Architecture Overview, 2.1 Pre-Flight Verification, 2.2 Applying Database Migrations, 2.3 Starting Services, 2. Zero-Downtime Deployment Procedure, 3.1 Publishing Rules Live (< 1 Second), 3.2 One-Click Rollback Flow, 3. Real-Time Publish & Instant Rollback Runbook (+21 more)

### Community 36 - "api.test.js"
Cohesion: 0.25
Nodes (6): assert, jwt, http, makeRequest(), runTests(), app

### Community 37 - "Bellad & Co. Dealership Loyalty & Rewards Platform"
Cohesion: 0.09
Nodes (21): 1. Executive Summary & Core Philosophy, 1. Multi-Tenant Isolation, 1. Points Earning Engine (`points.service.js` & `masterRuleEngine.service.js`), 2. Points Redemption Workflow (`redemption.service.js`), 2. Role-Based Access Control (RBAC), 2. System Architecture & Tech Stack, 3. Complete Page & Screen Directory, 3. Gift Card & Voucher System (`giftCard.service.js` & `giftEngine.service.js`) (+13 more)

### Community 38 - "services"
Cohesion: 0.09
Nodes (21): databases, databaseName, name, plan, postgresMajorVersion, user, fromDatabase, generateValue (+13 more)

### Community 39 - "StandaloneMasterEditorPortal"
Cohesion: 0.09
Nodes (14): BRAND_MODELS_MAP, ModelRedemptionCapStudio(), STATUS_BADGES, DEALERSHIPS, LoyaltyAppBuilder(), TEST_CUSTOMERS, MasterRuleEditorScreen(), DEALERSHIPS (+6 more)

### Community 40 - "env.js"
Cohesion: 0.22
Nodes (6): crypto, env, bcrypt, crypto, jwt, crypto

### Community 42 - "ports"
Cohesion: 0.11
Nodes (18): apiVersion, kind, app, app.kubernetes.io/component, app.kubernetes.io/name, metadata, labels, name (+10 more)

### Community 43 - "ports"
Cohesion: 0.11
Nodes (18): apiVersion, kind, app, app.kubernetes.io/component, app.kubernetes.io/name, metadata, labels, name (+10 more)

### Community 44 - "AddReceiptModal"
Cohesion: 0.11
Nodes (11): CorrectionsQueue(), AddReceiptModal(), CATEGORIES, formatInr(), GST_SLABS, Customer360View(), EligibilityBanner(), RedemptionModal() (+3 more)

### Community 45 - "CorrectionService"
Cohesion: 0.17
Nodes (5): testCorrectionFlow(), CorrectionController, fs, path, CorrectionService

### Community 47 - "PortalDashboardScreen.jsx"
Cohesion: 0.18
Nodes (7): EnrollmentScreen(), INITIAL_MONTHLY_OFFERS, LedgerRow, PassSkeleton(), TIER_BENEFITS_DATA, CARD_THEMES, PRESET_AMOUNTS

### Community 49 - "pg"
Cohesion: 0.10
Nodes (12): { Client }, c, { Client }, c, { Client }, c, { Client }, pg@^8.12.0 (+4 more)

### Community 50 - "RealBooks Integration Explained Simply: Complete Non-Technical Guide"
Cohesion: 0.12
Nodes (16): 1. What is an API and RealBooks in Everyday Words?, 2. What is a "Ledger" and Why Must We Create It First?, 3. What is a "Voucher" and Double-Entry Accounting?, 4. What are `CID` and `SEGID`?, 5. Master Segment ID Lookup Table, 6. How the App Automatically Detects the Segment ID, 7. Step-by-Step Flow When a Cashier Clicks "Push to RealBooks", 8. Safe Sandbox Test Mode vs Live Production Mode (+8 more)

### Community 51 - "PodDisruptionBudget backend-pdb"
Cohesion: 0.15
Nodes (16): PodDisruptionBudget backend-pdb, PodDisruptionBudget frontend-pdb, app, name, namespace, apiVersion, kind, metadata (+8 more)

### Community 52 - "Bellad & Co Loyalty Platform - Enterprise Kubernetes Architecture & Deployment Guide"
Cohesion: 0.13
Nodes (14): 1. High-Level Kubernetes Topology, 1. Horizontal Pod Autoscaling (HPA), 2. Manifest Inventory (`k8s/` Directory), 2. Switching to Managed Cloud Database (AWS RDS / Cloud SQL), 3. Step-by-Step Deployment Instructions, 3. Zero-Downtime Rolling Updates, 4. Scaling & Production Best Practices, 5. Useful Troubleshooting Commands (+6 more)

### Community 53 - "publicBalance.service.js"
Cohesion: 0.30
Nodes (3): testPhase5PublicBalance(), PublicBalanceController, PublicBalanceService

### Community 54 - "auth.js"
Cohesion: 0.17
Nodes (9): AuthController, invalidateSessionCache(), jwt, sessionCache, loginRateLimiter(), express, router, loginSchema (+1 more)

### Community 55 - "reltigrow.provider.js"
Cohesion: 0.16
Nodes (8): https, options, origin, req, http, https, normalizeToE164India(), ReltigrowWhatsAppProvider

### Community 56 - "containers"
Cohesion: 0.15
Nodes (13): command, envFrom, image, imagePullPolicy, lifecycle, name, ports, resources (+5 more)

### Community 57 - "whatsapp.provider.js"
Cohesion: 0.33
Nodes (3): 🛠️ Tech Stack & Key Rules, BaseWhatsAppProvider, MockWhatsAppProvider

### Community 58 - "labels"
Cohesion: 0.23
Nodes (12): StatefulSet postgres, app, app.kubernetes.io/component, app.kubernetes.io/name, labels, name, namespace, metadata (+4 more)

### Community 59 - "SearchService"
Cohesion: 0.30
Nodes (4): testSearchSpeed(), verify(), SearchController, SearchService

### Community 60 - "AppSheetSyncEngine"
Cohesion: 0.15
Nodes (4): AppSheetController, ImportController, AppSheetSyncEngine, ExcelOrderImportService

### Community 61 - "appsheet.routes.js"
Cohesion: 0.29
Nodes (5): appsheetAuth(), crypto, appsheetRateLimiter(), express, router

### Community 62 - "containers"
Cohesion: 0.20
Nodes (10): env, image, imagePullPolicy, livenessProbe, name, ports, readinessProbe, resources (+2 more)

### Community 63 - "initContainers"
Cohesion: 0.20
Nodes (10): command, image, name, initContainers, template, volumes, metadata, spec (+2 more)

### Community 64 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, db:backup, dev, migrate, migrate:dry-run, seed, start (+2 more)

### Community 65 - "create-before-gst-backup.js"
Cohesion: 0.20
Nodes (6): path, { spawnSync }, testSuites, { execSync }, fs, path

### Community 67 - "RedemptionEligibilityService"
Cohesion: 0.18
Nodes (4): runRegressionSuite(), verify(), runRedemptionStatusCron(), RedemptionEligibilityService

### Community 68 - "import.routes.js"
Cohesion: 0.11
Nodes (14): multer@^2.3.0, multer, express, fs, multer, path, router, storage (+6 more)

### Community 70 - "labels"
Cohesion: 0.22
Nodes (8): apiVersion, kind, app.kubernetes.io/name, app.kubernetes.io/part-of, environment, metadata, labels, name

### Community 71 - "PersistentVolumeClaim postgres-pvc"
Cohesion: 0.40
Nodes (5): spec, storage, requests, accessModes, resources

### Community 72 - "Service postgres-service"
Cohesion: 0.33
Nodes (6): name, port, targetPort, spec, ports, type

### Community 73 - "spec"
Cohesion: 0.22
Nodes (8): apiVersion, kind, app, matchLabels, spec, replicas, revisionHistoryLimit, selector

### Community 74 - "kustomization.yaml"
Cohesion: 0.22
Nodes (8): apiVersion, commonLabels, app.kubernetes.io/managed-by, app.kubernetes.io/name, app.kubernetes.io/part-of, kind, namespace, resources

### Community 77 - "PersistentVolumeClaim postgres-pvc"
Cohesion: 0.29
Nodes (6): PersistentVolumeClaim postgres-pvc, Service postgres-service, apiVersion, kind, apiVersion, kind

### Community 78 - "Skeleton.jsx"
Cohesion: 0.54
Nodes (7): ShimmerBar(), SkeletonCard(), SkeletonCustomerProfile(), SkeletonKycQueue(), SkeletonLine(), SkeletonStatCard(), SkeletonTable()

### Community 82 - "Project Context: Multi-Tenant Loyalty App Builder Platform (SaaS)"
Cohesion: 0.29
Nodes (6): 1. Product Vision, 2. The Golden Rules (Strict Architectural Principles), 3. Technology Stack & Architecture, 4. 14 Implementation Modules in Sequential Order, 5. Working Rules, Project Context: Multi-Tenant Loyalty App Builder Platform (SaaS)

### Community 83 - "spec"
Cohesion: 0.29
Nodes (7): app, app, matchLabels, replicas, selector, serviceName, spec

### Community 84 - "labels"
Cohesion: 0.29
Nodes (7): app, app.kubernetes.io/component, app.kubernetes.io/name, metadata, labels, name, namespace

### Community 87 - "engines"
Cohesion: 0.27
Nodes (6): devDependencies, nodemon@^3.1.4, engines, node, npm, nodemon

### Community 88 - "ref_path"
Cohesion: 0.17
Nodes (5): fs, path, fs, path, path

### Community 89 - "template"
Cohesion: 0.33
Nodes (6): template, volumes, metadata, spec, name, persistentVolumeClaim

### Community 90 - "livenessProbe"
Cohesion: 0.33
Nodes (6): livenessProbe, failureThreshold, httpGet, initialDelaySeconds, periodSeconds, timeoutSeconds

### Community 91 - "readinessProbe"
Cohesion: 0.33
Nodes (6): readinessProbe, failureThreshold, httpGet, initialDelaySeconds, periodSeconds, timeoutSeconds

### Community 93 - "app.js"
Cohesion: 0.13
Nodes (14): allowedOrigins, clientDistPath, cors, corsOptions, defaultOrigins, envCorsOrigins, envFrontendUrl, express (+6 more)

### Community 94 - "Loyalty App — Audit Brief for Claude Code"
Cohesion: 0.33
Nodes (5): Known confirmed bug (reproduce first), Loyalty App — Audit Brief for Claude Code, Output format, Requirements checklist to verify, Your task

### Community 97 - "kyc.service.js"
Cohesion: 0.18
Nodes (6): bcrypt, testPhase3Kyc(), RedemptionController, bcrypt, KycService, decrypt()

### Community 99 - "fix-login.js"
Cohesion: 0.40
Nodes (4): bcrypt, c, { Client }, demo

### Community 100 - "strategy"
Cohesion: 0.40
Nodes (5): maxSurge, maxUnavailable, strategy, rollingUpdate, type

### Community 101 - "ref_fs"
Cohesion: 0.18
Nodes (5): fs, path, fs, path, fs

### Community 102 - "apply-bellad-branches.js"
Cohesion: 0.50
Nodes (4): BELLAD_BRANCHES, { Pool }, run(), updateDbBranches()

### Community 104 - "reset-render.js"
Cohesion: 0.33
Nodes (4): c, { Client }, files, fs

### Community 105 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, outputDirectory, rewrites

### Community 106 - "CashierDashboard"
Cohesion: 0.22
Nodes (5): AddCustomerModal(), BulkImportModal(), LogBadge(), MessageLogModal(), CashierDashboard()

### Community 107 - "startupProbe"
Cohesion: 0.50
Nodes (4): startupProbe, failureThreshold, httpGet, periodSeconds

### Community 108 - "appsheet.js"
Cohesion: 0.83
Nodes (3): extractCustomerPrDetails(), fetchAppSheetPRDoneRows(), main()

### Community 109 - "correction.routes.js"
Cohesion: 0.25
Nodes (6): fs, multer, path, storage, uploadCorrectionProof, uploadDir

### Community 112 - "baseline-migrations.js"
Cohesion: 0.40
Nodes (4): baselineMigrations(), fs, path, { Pool }

### Community 116 - ".getCustomerById"
Cohesion: 0.16
Nodes (4): testGetCustomer(), AppSheetSearchService, MergeService, TierService

### Community 122 - "api.test.js"
Cohesion: 0.25
Nodes (8): http, run(), startServer(), stopServer(), testEndpoint(), http, makeRequest(), runSessionTest()

## Knowledge Gaps
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Automobile Dealership Group Loyalty Program - Backend & POS Counter` connect `Automobile Dealership Loyalty Program — Design System` to `whatsapp.provider.js`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **Should `ApiService` be split into smaller, more focused modules?**
  _Cohesion score 0.03276848838514196 - nodes in this community are weakly interconnected._
- **Why does `🛠️ Tech Stack & Key Rules` connect `whatsapp.provider.js` to `Automobile Dealership Loyalty Program — Design System`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.035232212308396245 - nodes in this community are weakly interconnected._
- **Why does `Automobile Dealership Loyalty Program — Design System` connect `Automobile Dealership Loyalty Program — Design System` to `react`?**
  _High betweenness centrality (0.219) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.07925407925407925 - nodes in this community are weakly interconnected._
- **Should `invoiceV2.controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._