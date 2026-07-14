# Launch Readiness Audit Phase A

## Executive Summary

ASHE TOKUN is a broad Next.js 16 App Router application with a live Supabase-backed admin/staff commerce foundation, a repository/mutation layer for major business domains, and a substantial manual SQL/policy archive in `supabase/`.

The architecture is functional and increasingly cohesive, but it is still in a development-foundation state. The largest launch-readiness risks are not isolated syntax problems; they are operational hardening gaps:

- many development RLS policies allow unrestricted anonymous writes
- several mutation flows are sequential application writes rather than database RPC/transaction boundaries
- some routes and components still carry phase placeholders, debug logging, and deferred workflow language
- admin UI strings are largely hardcoded while storefront/staff localization is more mature
- large client components and mutation files concentrate too many responsibilities
- public assets include large unoptimized images, `.DS_Store` files, empty product folders, and default Vercel/Next SVGs

Verification at the time of this audit:

- `npm run lint`: pass
- `npm run build`: pass after network access was allowed for Google Fonts
- SQL executed: no
- schema changed: no
- data modified: no
- files deleted: no
- commits made: no

## Architecture Overview

### Runtime

- Framework: Next.js `16.2.10` with App Router and Turbopack.
- React: `19.2.4`.
- Styling: Tailwind CSS v4 through `@import "tailwindcss"` in `app/globals.css`.
- Data backend: Supabase JS client plus service-role server client.
- Auth: custom staff PIN/session model using HTTP-only staff session cookie and `staff_sessions`.
- PDFs: `pdf-lib` for timecard and payroll PDFs.
- Scripts: standalone `tsx` scripts for owner bootstrap and data/media/inventory migration.

### Main Domains

- Storefront: `/`, `/shop`, `/shop/[slug]`, `/shop/category/[slug]`.
- Admin catalog: products, categories, collections, product types, traditions, vendors, media.
- Commerce: POS, orders, customers, returns, shipping, inventory.
- Staff: PIN auth, Staff Portal, permissions, staff profiles.
- Scheduling: schedules, shifts, availability, time-off.
- Timekeeper: punches, timecards, exceptions, PDFs.
- Payroll: payroll periods, payroll rows, exports, package/PDF foundation.
- Supabase: schema snapshot, phased migrations, development policies, storage policy setup.

## Files Inspected

Audit commands inspected the following repository areas:

- `app/`
- `components/`
- `lib/`
- `supabase/`
- `public/`
- `docs/`
- `scripts/`
- `proxy.ts`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `.env.example`
- `AGENTS.md`
- `README.md`
- `CLAUDE.md`

Directories requested in scope but not present:

- `hooks/`
- `providers/`
- `styles/`

## Phase A.1 Project Structure

### Folder Organization

- `app/`: Next route tree and API routes.
- `components/admin/`: operational admin UI and forms.
- `components/staff/`: staff portal UI.
- `components/shop/`: storefront and category UI.
- `components/home/`: homepage traditions section.
- `components/shared/`: new shared header/menu/breadcrumb components.
- `lib/data/`: domain repositories and mutations.
- `lib/staff/`: staff auth, session, permissions, role templates.
- `lib/types/`: domain types.
- `lib/pdf/`: PDF generation.
- `lib/payroll/`: payroll auth/export helpers.
- `lib/storage/`: Supabase Storage media upload helpers.
- `lib/timekeeper/`: punch/timecard calculation helpers.
- `lib/translations/`: English, Spanish, Yoruba translation objects.
- `supabase/`: schema, seed SQL, migrations, policies, storage setup.
- `public/`: brand, category, and product images.
- `scripts/`: one-time migration/bootstrap scripts.
- `docs/`: phase and architecture documentation.

### Large Folders and Split Candidates

- `components/admin/` is the largest component folder and mixes tables, forms, wizards, detail managers, print views, and operational flows.
- `lib/data/` mixes repositories and mutations; some files exceed 700 to 900 lines.
- `supabase/` contains both historical schema setup and active development policy files; it would benefit from stricter organization before production.
- `public/products/` has many empty legacy category folders and migrated commercial image folders.

### Empty Folders

Notable empty folders:

- `app/admin/timekeeper/[id]/print`
- `public/backgrounds`
- `public/banners`
- `public/hero`
- `public/icons`
- many empty legacy folders under `public/products/`

### File Counts

Approximate audited file counts by extension:

- TypeScript: 99
- TSX: 140
- SQL: 37
- Markdown: 18
- JPEG: 45
- SVG: 9
- PNG: 2
- CSS: 1
- `.DS_Store`: 7

## Phase A.2 Component Audit

### Largest Components

- `components/admin/EditProductForm.tsx`: 1,310 lines
- `components/admin/ProductCreationWizard.tsx`: 1,190 lines
- `components/admin/AdminPOS.tsx`: 1,138 lines
- `components/admin/ShipmentCreationWizard.tsx`: 1,044 lines
- `components/admin/CustomerDetailManager.tsx`: 728 lines
- `components/admin/MediaLibrary.tsx`: 647 lines
- `components/admin/InventoryItemDetail.tsx`: 605 lines

These are strong candidates for later splitting into smaller form sections, table views, hooks/actions, and shared field components.

### Shared Components Present

- `components/shared/AuthenticatedUserMenu.tsx`
- `components/shared/Breadcrumbs.tsx`
- `components/shared/NotificationCenter.tsx`
- `components/shared/PageHeader.tsx`

### Overlapping Responsibilities

- `AdminShell`, `AdminHeader`, and `AdminSidebar` now centralize admin chrome, but many pages still define local card/header/action layouts.
- Multiple admin managers duplicate filter/search table patterns.
- Several forms duplicate input classes and status-message patterns.
- Multiple detail managers duplicate timeline/card/table visual structures.

### Potential Legacy Components

- `PrintableStaffSchedule.tsx` remains active for schedule print.
- Legacy HTML timecard print files appear removed, but the empty route folder remains at `app/admin/timekeeper/[id]/print`.
- `AdminDashboardStats.tsx` still uses client-side local product store logic while much of catalog/admin now uses repositories.

### Imported Nowhere

Simple basename reachability did not identify a clearly unused component. This is not a full dead-code proof because dynamic imports, route imports, and component naming can hide usage patterns.

## Phase A.3 Route Audit

### Public Routes

- `/`
- `/shop`
- `/shop/[slug]`
- `/shop/category/[slug]`

### Staff Routes

- `/staff`
- `/staff/login`
- `/staff/change-pin`
- `/staff/schedule`
- `/staff/availability`
- `/staff/time-off`
- `/staff/timekeeper`
- `/staff/timekeeper/history`

Staff routes sit under `app/staff/layout.tsx`, which provides the existing `LanguageProvider`.

### Admin Routes

Admin pages include dashboard, catalog, products, media, inventory, orders, shipping, returns, customers, staff, scheduling, timekeeper, payroll, database, settings, vendors, and analytics.

Admin pages use `AdminShell`, and `AdminShell` calls `requireAdminRouteAccess()`.

### API Routes

- `/api/admin/timekeeper/[id]/pdf`
- `/api/admin/payroll/[id]/export/csv`
- `/api/admin/payroll/[id]/export/xlsx`
- `/api/admin/payroll/[id]/pdf`
- `/api/admin/payroll/[id]/package`

### Route Risks

- `proxy.ts` checks the staff cookie for `/staff/*` but does not pre-check `/admin/*`; admin protection occurs inside route rendering through `AdminShell`.
- Admin API routes use route handlers and must be checked for server-side permission enforcement before production.
- `app/admin/timekeeper/[id]/print` is an empty leftover route directory.
- Some routes remain placeholder-like by copy, such as analytics/settings/database foundation pages.
- Routes not represented in `AdminSidebar` can still exist intentionally as nested/detail/create routes.

## Phase A.4 Server Actions

Server-action files found:

- `lib/staff/staffActions.ts`
- `lib/staff/staffLogoutAction.ts`
- `lib/data/schedulingMutations.ts`
- `lib/data/timekeeperMutations.ts`
- `lib/data/payrollMutations.ts`

High-volume action/mutation files:

- `lib/staff/staffActions.ts`: 950 lines
- `lib/data/schedulingMutations.ts`: 905 lines
- `lib/data/payrollMutations.ts`: 821 lines
- `lib/data/timekeeperMutations.ts`: 734 lines

Future consolidation candidates:

- Split staff profile lifecycle, session/PIN actions, permission actions, and audit helpers.
- Split scheduling period, shift, availability, time-off actions.
- Split payroll period lifecycle, employee review, export/package helpers, and audit/event writing.

## Phase A.5 Repository Layer

Repository files:

- `brands.ts`
- `catalogMetrics.ts`
- `categories.ts`
- `collections.ts`
- `customersRepository.ts`
- `inventoryRepository.ts`
- `mediaRepository.ts`
- `ordersRepository.ts`
- `payrollRepository.ts`
- `posRepository.ts`
- `productMediaRepository.ts`
- `productsRepository.ts`
- `returnsRepository.ts`
- `schedulingRepository.ts`
- `shippingOriginsRepository.ts`
- `shippingRepository.ts`
- `staffRepository.ts`
- `storefrontCategories.ts`
- `timekeeperRepository.ts`
- `traditions.ts`
- plus matching mutation files for many domains

Large repositories:

- `ordersRepository.ts`: 627 lines
- `schedulingRepository.ts`: 625 lines
- `posRepository.ts`: 613 lines
- `payrollRepository.ts`: 578 lines
- `inventoryRepository.ts`: 508 lines
- `shippingRepository.ts`: 496 lines
- `timekeeperRepository.ts`: 436 lines

Future split candidates:

- POS product/customer/order reads should split from receipt/order-number helpers.
- Scheduling reads should split schedule periods, shifts, availability, time-off, events, and metrics.
- Payroll reads should split period list/detail, employee detail, exports, package data, and fallback current-period logic.
- Inventory reads should split locations, item detail, transaction ledger, and summaries.

## Phase A.6 Translation Audit

Translation files:

- `lib/translations/en.ts`
- `lib/translations/es.ts`
- `lib/translations/yo.ts`
- `lib/translations/index.ts`

Current pattern:

- Storefront and Staff Portal use `LanguageProvider`.
- Admin chrome now has provider coverage through `app/admin/layout.tsx`.
- Many admin page bodies still use hardcoded English strings directly.

Issues found:

- Yoruba file explicitly contains draft placeholder comments.
- Phase-related old copy remains in staff translations, such as Phase 10.1/10.2 messages.
- Admin modules contain many hardcoded labels, descriptions, placeholders, empty states, and action names.
- Some translation keys may be present but not widely used because admin localization is incomplete.

High-risk hardcoded areas:

- `app/admin/orders/[id]/page.tsx`
- `components/admin/*Manager.tsx`
- `components/admin/*Wizard.tsx`
- `components/admin/*Form.tsx`
- `app/admin/database/page.tsx`

## Phase A.7 CSS Audit

CSS files:

- `app/globals.css`

Tailwind usage is mostly inline utility classes in TSX files.

CSS observations:

- `globals.css` is compact and mostly print-related.
- Staff schedule print CSS is global but scoped through `.staff-schedule-page` and `#staff-schedule-print`.
- `.no-print` is global and used by schedule and timecard detail components.
- Previous timecard print isolation has been replaced by PDF flow, but schedule print CSS remains.

Risk:

- Print CSS has caused regressions previously and should stay tightly scoped.
- Inline class repetition is high across admin form components.

## Phase A.8 Image Audit

Public assets:

- 51 files under `public/products`
- 4 category SVG files
- 1 brand image
- 5 default Vercel/Next SVG files
- several `.DS_Store` files

Largest images:

- `public/products/ajako-originals/opele/custom-opele-01.jpeg`: 2.4 MB
- `public/products/ajako-originals/opele/ajako-custom-opele-01.jpeg`: 2.4 MB
- `public/brand/ashe-tokun-logo.png`: 1.8 MB
- `public/products/ide/bracelet/ide-todos-los-santos-02.png`: 1.1 MB
- `public/products/ajako-originals/keychains/ireme-keychain-01.jpeg`: 824 KB

Cleanup candidates:

- remove `.DS_Store` files
- remove default `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` if unused
- compress/resize large product and brand images
- remove or document empty media/category folders
- verify duplicate-looking Opele images before deletion

## Phase A.9 Dependency Audit

Dependencies:

- `@supabase/supabase-js`
- `bcryptjs`
- `next`
- `pdf-lib`
- `react`
- `react-dom`

Dev dependencies:

- `@tailwindcss/postcss`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `eslint`
- `eslint-config-next`
- `tailwindcss`
- `tsx`
- `typescript`

Observations:

- All major runtime packages have visible usage.
- `tsx` is used by package scripts.
- `tailwindcss` and `@tailwindcss/postcss` are used by Tailwind v4 CSS/PostCSS setup.
- No obvious duplicate UI libraries or date libraries are installed.
- Build relies on Google Fonts through `next/font/google`, requiring network access during build unless fonts are vendored/localized later.

## Phase A.10 Environment Audit

`.env.example` documents:

- Supabase URL/anon/service role keys
- staff session duration/inactivity/lockout values
- shipping origin fallback variables
- business timezone
- timekeeper rules

Referenced but not documented in `.env.example`:

- `NODE_ENV` is used for cookie security.

Potential concern:

- `USE_SUPABASE` is a hardcoded exported constant in `lib/config.ts`, not an environment variable.
- Migration scripts use anon keys for writes during development policies; production should move to service role or secured staff server actions where appropriate.

## Phase A.11 Documentation Audit

Docs present:

- database architecture and business model
- Phase 9 security/commerce/atomicity docs
- Phase 10 staff/scheduling/timekeeper docs
- Phase 11 payroll docs
- execution checklist
- staff numbering and permissions architecture
- executive governance

Outdated or risk-prone docs:

- `docs/database-architecture.md` still references earlier local-catalog phases and future data activation in places.
- `docs/phase-10-staff-auth-roadmap.md` includes older foundation language now partly implemented.
- `docs/supabase-execution-checklist.md` is long and mixes many phases; production operators may need a shorter launch checklist.

Missing docs:

- production RLS/security replacement plan
- environment variable deployment guide
- backup/restore and rollback runbook
- production launch cutover checklist
- privacy/security handling for customer and staff PII
- payment/refund external processor operating procedure
- monitoring/logging/error reporting plan

## Phase A.12 Technical Debt Inventory

### Critical

1. Development RLS policies grant broad anon access.
   - Location: `supabase/policies-*-development.sql`
   - Reason: convenient for development but not production safe.
   - Recommended cleanup: replace with authenticated staff-role RLS and server-side claims.
   - Risk: critical
   - Complexity: high

2. Sequential multi-table writes without database transaction/RPC boundaries.
   - Location: POS, returns, shipping, payroll, scheduling, inventory mutation files.
   - Reason: partial failures can create inconsistent records.
   - Recommended cleanup: move high-risk workflows to database RPCs or transactional server orchestration.
   - Risk: critical
   - Complexity: high

3. Service-role Supabase client is central to server reads/mutations.
   - Location: `lib/supabase/service.ts`, many repositories/actions.
   - Reason: safe only if never imported into client and deployed carefully.
   - Recommended cleanup: audit all imports and introduce privileged operation boundaries.
   - Risk: critical
   - Complexity: medium

### High

4. Large all-in-one components.
   - Location: `EditProductForm`, `ProductCreationWizard`, `AdminPOS`, `ShipmentCreationWizard`.
   - Reason: hard to verify, localize, and regression-test.
   - Recommended cleanup: split into sections and shared form components.
   - Risk: high
   - Complexity: medium

5. Large mutation files.
   - Location: `staffActions`, `schedulingMutations`, `payrollMutations`, `timekeeperMutations`.
   - Reason: mixed responsibilities and audit logic.
   - Recommended cleanup: split by workflow and create shared mutation result/error helpers.
   - Risk: high
   - Complexity: medium

6. Hardcoded English in admin modules.
   - Location: many admin pages/components.
   - Reason: localization incomplete for admin operations.
   - Recommended cleanup: phase admin i18n.
   - Risk: high
   - Complexity: high

7. Runtime build depends on Google font network fetch.
   - Location: `app/layout.tsx`.
   - Reason: production builds can fail in restricted/offline environments.
   - Recommended cleanup: self-host fonts or configure deployment build network.
   - Risk: high
   - Complexity: low

8. Debug/diagnostic logging remains in server paths.
   - Location: scheduling detail page, product/media/orders/repository logs, payroll create diagnostics.
   - Reason: noisy logs and possible data leakage if expanded.
   - Recommended cleanup: replace with controlled logger and redact consistently.
   - Risk: high
   - Complexity: low

### Medium

9. Empty/legacy route and asset folders.
   - Location: `app/admin/timekeeper/[id]/print`, `public/products/**`.
   - Reason: confusion and stale paths.
   - Recommended cleanup: delete after verification.
   - Risk: medium
   - Complexity: low

10. Hardcoded `USE_SUPABASE = true`.
    - Location: `lib/config.ts`.
    - Reason: environment-specific behavior should be deploy-configurable.
    - Recommended cleanup: use an environment variable with safe parsing.
    - Risk: medium
    - Complexity: low

11. Multiple Supabase client entrypoints.
    - Location: `lib/supabase.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/service.ts`.
    - Reason: potential confusion over anon/service contexts.
    - Recommended cleanup: document and consolidate naming.
    - Risk: medium
    - Complexity: low

12. Public images are not optimized.
    - Location: `public/products`, `public/brand`.
    - Reason: large download sizes.
    - Recommended cleanup: compress, resize, convert to WebP/AVIF where appropriate.
    - Risk: medium
    - Complexity: medium

13. Admin route permission and sidebar permission lists are duplicated.
    - Location: `lib/staff/permissionGuard.ts`, `components/admin/AdminSidebar.tsx`.
    - Reason: routes can drift from navigation.
    - Recommended cleanup: derive both from one route registry.
    - Risk: medium
    - Complexity: medium

### Low

14. Default SVG assets remain in `public`.
    - Location: `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`.
    - Reason: default starter assets likely unused.
    - Recommended cleanup: remove after grep confirmation.
    - Risk: low
    - Complexity: low

15. `.DS_Store` files are committed or present.
    - Location: `public/`.
    - Reason: local OS artifacts.
    - Recommended cleanup: remove and ignore.
    - Risk: low
    - Complexity: low

16. Documentation is phase-heavy.
    - Location: `docs/`.
    - Reason: useful for development history but noisy for launch operations.
    - Recommended cleanup: create concise production operator docs.
    - Risk: low
    - Complexity: medium

## Phase A.13 Cleanup Candidates

List only. No cleanup was performed.

### Dead or Legacy Code Candidates

- Empty route folder: `app/admin/timekeeper/[id]/print`
- Legacy phase copy in `AdminSidebar` UI foundation note
- Phase/foundation notices in Staff Portal translations
- Placeholder actions in Product Creation Wizard
- Placeholder settings copy in `/admin/settings`
- Placeholder analytics page

### Dead Asset Candidates

- `.DS_Store` files in `public/`
- default `public/file.svg`
- default `public/globe.svg`
- default `public/next.svg`
- default `public/vercel.svg`
- default `public/window.svg`
- empty legacy folders under `public/products`

### Temporary Debugging / Console Logs

- `app/admin/scheduling/[id]/page.tsx`
- `lib/data/payrollMutations.ts`
- `lib/data/productsRepository.ts`
- `lib/data/productMediaMutations.ts`
- `lib/data/ordersRepository.ts`
- `lib/data/shippingRepository.ts`
- `lib/data/customersRepository.ts`
- `lib/data/inventoryRepository.ts`
- `lib/storage/mediaStorage.ts`
- migration/bootstrap scripts

### Large Split Candidates

- `components/admin/EditProductForm.tsx`
- `components/admin/ProductCreationWizard.tsx`
- `components/admin/AdminPOS.tsx`
- `components/admin/ShipmentCreationWizard.tsx`
- `lib/staff/staffActions.ts`
- `lib/data/schedulingMutations.ts`
- `lib/data/payrollMutations.ts`
- `lib/data/timekeeperMutations.ts`

## Phase A.14 Architecture Score

- Architecture: 76 / 100
- Maintainability: 68 / 100
- Scalability: 72 / 100
- Consistency: 70 / 100
- Modularity: 66 / 100
- Code organization: 71 / 100
- Developer experience: 74 / 100

Overall score: 71 / 100

Interpretation: strong development foundation, but not production-clean yet. The architecture is viable; launch readiness depends on security hardening, transaction boundaries, admin localization, asset cleanup, and reducing large-module risk.

## Recommended Cleanup Order

1. Replace all development anon RLS policies with authenticated role-based production policies.
2. Add production route/API permission audit for every admin and API route.
3. Move high-risk multi-table writes into RPC/transaction-safe flows.
4. Remove debug logging and temporary diagnostics from normal runtime paths.
5. Compress and clean public assets.
6. Split largest admin components into section components.
7. Split largest mutation files by workflow.
8. Create a single route/navigation/permission registry.
9. Convert admin hardcoded strings into translations.
10. Create concise production deployment and rollback docs.

## Production Risks

- Customer, staff, and order data are sensitive; unrestricted dev policies cannot ship.
- Service-role usage must remain server-only and should be reviewed before launch.
- Returns, shipping, POS, payroll, and inventory flows can span multiple tables; partial failure handling must be hardened.
- Build pipeline depends on external Google font access.
- Debug logs may reveal internal IDs or operational details.
- Large components increase regression risk during final fixes.

## Top 20 Highest Priority Cleanup Tasks

1. Replace development RLS policies.
2. Audit API route permission checks.
3. Add transactional/RPC flow for POS checkout.
4. Add transactional/RPC flow for returns completion.
5. Add transactional/RPC flow for shipment creation/status changes.
6. Add transactional/RPC flow for inventory transfer/receive/adjust where needed.
7. Remove runtime debug logs.
8. Convert `USE_SUPABASE` to environment-driven configuration.
9. Self-host or vendor Google fonts.
10. Compress large public images.
11. Remove `.DS_Store` files.
12. Remove default starter SVGs if unused.
13. Remove empty legacy route/folder artifacts.
14. Split `EditProductForm`.
15. Split `ProductCreationWizard`.
16. Split `AdminPOS`.
17. Split `ShipmentCreationWizard`.
18. Split `staffActions`.
19. Split scheduling/payroll/timekeeper mutation files.
20. Create production launch checklist separate from phase execution history.
