# Launch Readiness Phase G: Functional Quality Assurance

Date: July 14, 2026

Scope: end-to-end functional QA inventory for storefront, admin, staff, commerce, scheduling, timekeeper, payroll, permissions, route behavior, and launch blockers.

No SQL was executed. No migrations were applied. No schema or Supabase data was modified. No test sales, returns, shipments, schedules, timecards, payroll rows, customers, products, media, or staff records were created.

## Executive Summary

ASHE TOKUN builds successfully and the core route shell is stable, but it is not production-launch ready yet.

The highest-risk launch blockers are already known from Phase E and Phase F.4A:

- Phase E production RLS migrations are prepared but intentionally not applied.
- Phase F.4 transactional RPC migration is prepared but intentionally not executed.
- Phase F.4A stopped correctly because no safe development Supabase backup/export checkpoint was confirmed.
- POS, return completion, and shipment creation remain server-side sequential workflows, not activated transaction-safe RPC workflows.

Functional QA also found public-facing and admin-facing polish defects that should be corrected before launch:

- homepage hero buttons still point to `#`
- tradition cards still point to `#`
- the Admin sidebar still displays stale copy claiming authentication and database access are not connected
- Analytics and Settings remain placeholder/foundation pages while visible in navigation
- Payroll dashboard filter blocks are non-interactive labels, not working filters

## Verification Performed

### Static Review

Reviewed current launch documentation:

- `docs/launch-readiness-phase-a.md`
- `docs/launch-readiness-phase-b-technical-cleanup.md`
- `docs/launch-readiness-phase-c-refactoring.md`
- `docs/launch-readiness-phase-d-security.md`
- `docs/launch-readiness-phase-e-supabase.md`
- `docs/launch-readiness-phase-f-server-actions.md`
- `docs/launch-readiness-phase-f1-orders-customers.md`
- `docs/launch-readiness-phase-f2-returns-shipping.md`
- `docs/launch-readiness-phase-f3-pos.md`
- `docs/launch-readiness-phase-f4-transactional-hardening.md`
- `docs/launch-readiness-phase-f4a-rpc-activation.md`
- `docs/phase-11-2-global-user-experience.md`

Reviewed route and component surfaces under:

- `app/`
- `components/`
- `lib/data/`
- `lib/staff/`
- `lib/storage/`
- `app/api/`

### Read-Only Route Smoke Checks

Local dev server was started for read-only route checks only. No forms were submitted and no records were created.

Passed smoke checks:

| Route | Result |
| --- | --- |
| `/` | `200 OK` |
| `/shop` | `200 OK` |
| `/shop/category/ide` | `200 OK` |
| `/staff` without cookie | `307` to `/staff/login?status=session_required` |
| `/staff/login` | `200 OK` |
| `/admin` without cookie | `307` to `/staff/login?status=session_required` |
| `/api/admin/timekeeper/[id]/pdf` without cookie | `401 Unauthorized`, `Cache-Control: no-store` |
| `/api/admin/payroll/[id]/export/csv` without cookie | `401 Unauthorized`, `Cache-Control: no-store` |
| `/api/admin/payroll/[id]/export/xlsx` without cookie | `401 Unauthorized`, `Cache-Control: no-store` |
| `/api/admin/payroll/[id]/pdf` without cookie | `401 Unauthorized`, `Cache-Control: no-store` |
| `/api/admin/payroll/[id]/package` without cookie | `401 Unauthorized`, `Cache-Control: no-store` |

Authenticated destructive workflows were not exercised because Phase G forbids uncontrolled test records and no controlled QA fixture set was created in this phase.

## Critical Findings

### G-C1: Production RLS and Transactional RPC Activation Remain Blocked

Severity: Critical

Evidence:

- `docs/launch-readiness-phase-e-supabase.md`
- `docs/launch-readiness-phase-f4a-rpc-activation.md`
- `supabase/migrations/phase-e-production-rls.sql`
- `supabase/migrations/phase-e-storage-security.sql`
- `supabase/migrations/phase-f4-transactional-hardening.sql`

Root cause:

Phase E production RLS and Phase F.4 transaction-safe RPCs are prepared but not activated. Phase F.4A correctly stopped before SQL execution because a safe development backup/export checkpoint was not confirmed.

Impact:

The application should not be considered production-ready until the backup is confirmed, development migration execution is verified, Server Actions are switched to RPCs, rollback/idempotency tests pass, and production RLS execution is re-reviewed.

Fix status:

Not fixed in Phase G. This is a controlled launch blocker.

### G-C2: Transaction-Critical Workflows Are Still Sequential

Severity: Critical

Evidence:

- `lib/data/posMutations.ts`
- `lib/data/returnMutations.ts`
- `lib/data/shippingMutations.ts`
- `docs/launch-readiness-phase-f4-transactional-hardening.md`

Affected workflows:

- POS sale completion
- return completion and restock/refund/store-credit issuance
- shipment creation/finalization

Root cause:

Server-side mutation migration is complete, but the prepared RPCs are not active.

Impact:

A mid-flow failure can still leave partial operational state requiring manual review.

Fix status:

Not fixed in Phase G. Resume Phase F.4A after a verified development backup/checkpoint.

## High Findings

### G-H1: Homepage Hero CTAs Do Not Navigate

Severity: High

File:

- `components/Hero.tsx:29`
- `components/Hero.tsx:35`

Root cause:

Both hero buttons use `href="#"`.

Impact:

Public storefront visitors clicking the primary or secondary hero action do not reach shop/category content.

Minimal fix:

Point primary CTA to `/shop` and secondary CTA to a real category, tradition, or informational route.

### G-H2: Tradition Card CTAs Do Not Navigate

Severity: High

File:

- `components/home/TraditionCard.tsx:40`

Root cause:

Tradition cards use `href="#"`.

Impact:

Homepage tradition exploration appears clickable but does not lead anywhere.

Minimal fix:

Add a real href prop and pass valid storefront/category/tradition links from the section data.

### G-H3: Admin Sidebar Shows False Authentication/Database Message

Severity: High

File:

- `components/admin/AdminSidebar.tsx:131`

Root cause:

The sidebar still displays:

`Authentication and database access are intentionally not connected yet.`

Impact:

This is inaccurate after staff authentication, Supabase repositories, server actions, and operational modules were connected. It can mislead staff and stakeholders during launch review.

Minimal fix:

Replace the stale foundation card with a current environment/status note or remove it.

### G-H4: Analytics Is Visible But Placeholder-Only

Severity: High

File:

- `app/admin/analytics/page.tsx:7`

Root cause:

Analytics remains a visual placeholder while the sidebar exposes it to users with `reports.sales`.

Impact:

Users can navigate to a module that does not provide operational analytics. This is acceptable only if explicitly labeled as deferred for launch.

Minimal fix:

Either remove/hide the nav entry for launch or convert the page into a clear deferred-state message with launch notes.

### G-H5: Settings Page Is Still Foundation/Placeholder Copy

Severity: High

File:

- `app/admin/settings/page.tsx:13`

Root cause:

Settings displays hardcoded foundation values and placeholder description while active shipping-origin settings exist.

Impact:

Staff may believe store settings are configurable when most are not.

Minimal fix:

Label non-editable settings clearly and move live settings such as Shipping Origins into a production-ready settings index.

### G-H6: Payroll Dashboard Filters Are Non-Interactive

Severity: High

File:

- `components/admin/AdminPayrollDashboard.tsx:161`

Root cause:

Payroll filter labels are displayed as static cards:

- Pay Period
- Employee
- Location
- Department
- Approval Status

Impact:

The dashboard advertises filters that do not filter payroll data.

Minimal fix:

Either implement read-only query filters or relabel the section as planned filter support until it works.

## Medium Findings

### G-M1: Notification Center Is UI-Only

Severity: Medium

File:

- `components/shared/NotificationCenter.tsx`

Root cause:

NotificationCenter has no persisted notifications, realtime subscription, or derived alert source.

Impact:

The UI is stable, but launch users should not expect operational alerts yet.

Status:

Documented as a known limitation in `docs/phase-11-2-global-user-experience.md`.

### G-M2: Account Settings and Activity Log Menu Items Are Disabled

Severity: Medium

File:

- `components/shared/AuthenticatedUserMenu.tsx`

Root cause:

Account Settings and Activity Log are visible disabled menu entries.

Impact:

This is acceptable as foundation UI, but should be hidden or clearly deferred before production if unsupported.

### G-M3: Sidebar and Route Permission Registries Can Drift

Severity: Medium

Files:

- `components/admin/AdminSidebar.tsx`
- `lib/staff/permissionGuard.ts`

Root cause:

Sidebar visibility and route protection are maintained in separate arrays.

Impact:

A future route could become visible without correct route permission, or protected without a matching nav state.

Status:

Static QA found current admin pages route through `AdminShell` or direct permission checks, but a shared route registry remains recommended before production.

### G-M4: Build Requires Google Fonts Network Access

Severity: Medium

File:

- `app/layout.tsx`

Root cause:

The app uses `next/font/google` for Geist and Geist Mono.

Impact:

`npm run build` fails in restricted/no-network environments unless font fetches are allowed.

Minimal fix:

Self-host fonts or document network requirements for production builds.

### G-M5: Yoruba Translations Remain Draft Placeholders

Severity: Medium

File:

- `lib/translations/yo.ts`

Root cause:

The file explicitly marks Yoruba copy as draft placeholders needing knowledgeable review.

Impact:

Language switching works structurally, but Yoruba content should not be considered final launch copy.

## Passed Functional Checks

### Route Protection

Passed:

- unauthenticated `/staff` redirects to login
- unauthenticated `/admin` redirects to login
- admin API download/export endpoints return `401` and `Cache-Control: no-store`
- static audit shows admin pages render through `AdminShell` or direct permission checks

### Language Provider Regression

Passed:

- `app/admin/layout.tsx` wraps admin routes in the existing `LanguageProvider`
- `app/staff/layout.tsx` wraps staff routes in the existing `LanguageProvider`
- `Breadcrumbs`, `AuthenticatedUserMenu`, `NotificationCenter`, and `PageHeader` are rendered inside the provider tree for admin/staff pages
- smoke routes did not reproduce `useLanguage must be used within LanguageProvider`

### Server-Side Mutation Boundary

Passed at static level:

- product, product media, inventory, order, customer, POS, returns, shipping, shipping origin, scheduling, timekeeper, payroll, and media upload action modules use server-side boundaries where previously migrated
- service-role helper imports were not found in Client Components during this audit

Remaining item:

- legacy browser-capable `lib/storage/mediaStorage.ts` remains in source until fully retired.

### Payroll Period UUID Regression

Passed at static level:

- dashboard action URLs now use `data.currentPeriod.id`
- export links are only active when a persisted period exists and generated rows exist
- no active `current-week` API URL pattern was found in the dashboard code

## Workflow QA Status

| Area | QA Status | Notes |
| --- | --- | --- |
| Storefront routes | Partial pass | Public routes smoke-tested. CTA link defects remain. |
| Admin shell | Partial pass | Protected unauthenticated redirect works. Stale sidebar copy remains. |
| Staff portal | Partial pass | Login and protected redirect work. Authenticated staff workflows require controlled fixture testing. |
| Products | Not live-mutated | Static server-action boundary reviewed. No product edits created. |
| Media | Not live-mutated | Server upload boundary exists. No files uploaded. Legacy helper remains. |
| Inventory | Not live-mutated | Server-action boundary reviewed. No stock changes created. |
| POS | Not live-mutated | Server-action boundary reviewed. Transactional RPC not active. |
| Orders | Not live-mutated | Server-action boundary reviewed. No order updates created. |
| Customers | Not live-mutated | Server-action boundary reviewed. No customer records created. |
| Returns | Not live-mutated | Server-action boundary reviewed. Transactional RPC not active. |
| Shipping | Not live-mutated | Server-action boundary reviewed. Transactional RPC not active. |
| Scheduling | Not live-mutated | Existing audit reviewed. No schedules/shifts created. |
| Timekeeper | Not live-mutated | API denial checked. No punches/timecards changed. |
| Payroll | Partial pass | Dashboard static behavior reviewed. Export APIs deny unauthenticated requests. Filters incomplete. |

## Manual QA Still Required

Run only after a controlled development fixture set or approved QA records exist:

1. Login as Owner and Managing Partner.
2. Login as Store Manager, Cashier, Inventory, Fulfillment, Customer Service, Accounting, and Marketing roles.
3. Verify sidebar visibility for each role.
4. Directly access forbidden admin routes and confirm 403 behavior.
5. Create/edit/archive product workflows with fixture products.
6. Upload media and link primary/gallery images with fixture products.
7. Perform inventory receive, adjustment, transfer, and reorder updates with fixture inventory.
8. Complete a POS sale with a fixture product and verify order, payment, receipt, inventory, and ledger rows.
9. Create, approve, receive, complete, and cancel fixture returns.
10. Create shipping and local pickup shipments from fixture orders.
11. Create schedules, add shifts, publish, print, and confirm staff schedule views.
12. Submit and review time-off requests.
13. Clock in/out against a published fixture shift and verify timecard PDF.
14. Create payroll periods, generate payroll, export CSV/XLSX/PDF/package, approve/close/reopen.
15. Verify language switching across storefront, admin header, staff portal, and new global components.

## Launch Recommendation

Status: **Not launch ready**

Required before production release:

1. Complete Phase F.4A backup/checkpoint and RPC activation workflow.
2. Verify rollback, idempotency, and audit behavior for POS, returns, and shipping RPCs.
3. Re-review and execute Phase E production RLS/storage hardening only after RPC/server boundaries are confirmed.
4. Fix public CTA dead links.
5. Remove or correct stale placeholder/foundation copy in admin navigation and visible pages.
6. Decide whether placeholder Analytics, non-interactive Payroll filters, disabled Account Settings/Activity Log, and draft Yoruba copy are launch-acceptable or should be hidden/deferred.
7. Run authenticated role-by-role manual QA with controlled fixture data.

## Verification Results

- `npm run lint`: pass.
- `npm run build`: pass after allowing network access for Google Fonts.
- SQL executed: no.
- Migrations applied: no.
- Data modified: no intentional data writes.
- UI redesigned: no.
- Business rules changed: no.
- Commit created: no.
