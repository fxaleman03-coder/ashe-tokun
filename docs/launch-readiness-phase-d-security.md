# Launch Readiness Phase D Security Audit

## Executive Summary

Phase D reviewed authentication, authorization, permissions, server actions,
download endpoints, Supabase usage, sensitive data handling, environment
variables, and production hardening gaps.

Two low-risk security corrections were applied:

- Payroll download route failures no longer return raw exception messages to
  the browser.
- Non-Owners can no longer grant or clone reserved ownership governance
  permissions through explicit staff permission overrides.

No SQL was executed. No migrations were created. No schema or Supabase data was
modified.

## Authentication Review

### Flow Reviewed

- Login: `lib/staff/staffActions.ts`, `lib/staff/staffAuthService.ts`
- Logout: `lib/staff/staffLogoutAction.ts`, `logoutCurrentStaff()`
- Session cookie: `lib/staff/sessionSecurity.ts`
- Session validation: `getAuthenticatedStaffReadOnlyResult()`
- Staff route pre-check: `proxy.ts`

### Findings

- Login verifies employee number, PIN hash, active state, employment status,
  lockout state, and creates a hashed session-token row.
- PINs and session tokens are not stored raw. PINs use bcrypt and session tokens
  are SHA-256 hashed before database lookup.
- The staff session cookie is HTTP-only, `sameSite: "lax"`, path-scoped to `/`,
  and secure in production.
- Read-only session validation rejects missing, expired, revoked, inactive, and
  stale sessions without mutating cookies during render.
- Logout revokes the session row and clears the HTTP-only cookie through a
  Server Action.

### Remaining Risk

- `proxy.ts` checks only cookie presence for `/staff/*`; the stronger database
  validation happens in server rendering and actions.
- `/admin/*` relies on `AdminShell`/server rendering for protection rather than
  middleware pre-checks.
- Back-button browser cache behavior is not explicitly controlled with
  admin/staff `Cache-Control` headers.

## Authorization Review

### Admin Pages

All audited admin pages render through `AdminShell` or use direct
`requirePermission()` checks. `AdminShell` calls `requireAdminRouteAccess()`,
which resolves the current path from the `x-ashe-pathname` header set in
`proxy.ts`.

### Staff Pages

Staff portal pages use `requireAuthenticatedStaff()`, `requirePermission()`, or
safe login/change-PIN redirects.

### API And Download Routes

Audited download routes:

- `/api/admin/payroll/[id]/export/csv`
- `/api/admin/payroll/[id]/export/xlsx`
- `/api/admin/payroll/[id]/package`
- `/api/admin/payroll/[id]/pdf`
- `/api/admin/timekeeper/[id]/pdf`

Each route performs authentication, permission checks, UUID validation, and
returns `Cache-Control: no-store` for generated files.

## Permission Matrix

### Owner

- Has full operational, staff, settings, audit, payroll, timekeeper, and
  ownership governance permissions.
- Retains reserved governance permissions:
  - `ownership.transfer`
  - `ownership.assign_owner`
  - `ownership.remove_last_owner`
  - `system.master_recovery`

### Managing Partner

- Inherits Owner-level operational permissions.
- Does not receive reserved ownership governance permissions by default.
- Cannot create or assign Owner role.
- Now cannot grant or clone reserved ownership governance permissions through
  explicit overrides.

### Store Manager / Legacy Manager

- Broad operational permissions.
- Cannot modify or assign executive roles.
- Does not receive `staff.permissions.manage` by template.

### Assistant Manager

- Delegated operations, timekeeper review support, POS, customers, and limited
  payroll view.
- Does not receive settings, accounting, or staff permission management.

### Accounting

- Receives payroll/export/accounting/refund-oriented permissions.
- Does not receive inventory adjustment or transfer permissions.

### Staff / Cashier / Inventory / Fulfillment / Customer Service / Marketing

- Role templates are scoped by module.
- Cashier does not receive product cost, settings, inventory adjustment, or
  accounting permissions.
- Inventory does not receive accounting permissions.
- Fulfillment does not receive payroll/settings/staff permissions.

## Route Protection

### Confirmed Protected

- Admin pages: protected through `AdminShell` and `requireAdminRouteAccess()`.
- Staff pages: protected through staff session/permission guards.
- Payroll downloads: protected through `requirePayrollRoutePermission()`.
- Timecard PDF: protected through staff session plus `timekeeper.view_all`.

### Risk

Route permissions and sidebar visibility still live in separate structures:

- `lib/staff/permissionGuard.ts`
- `components/admin/AdminSidebar.tsx`
- `lib/staff/staffPermissions.ts`

This creates drift risk and should be consolidated into one route registry before
production.

## Server Action Audit

### Server Actions Reviewed

- `lib/staff/staffActions.ts`
- `lib/staff/staffLogoutAction.ts`
- `lib/data/schedulingMutations.ts`
- `lib/data/timekeeperMutations.ts`
- `lib/data/payrollMutations.ts`

### Positive Findings

- Staff creation/update/PIN/session/permission actions require staff
  permissions.
- Scheduling server actions require scheduling permissions or validated
  authenticated staff self-access.
- Timekeeper server actions require timekeeper permissions or authenticated
  self-clock access.
- Payroll server actions require payroll permissions.
- Most sensitive actions write audit or event records.

### Risks

- Several server actions return formatted Supabase error details to UI. This is
  useful in development but should be replaced with generic user-facing errors
  and structured server logs before production.
- Some multi-step server actions still perform sequential writes instead of
  database transactions/RPCs.

## Supabase Usage Review

### Service Role

`lib/supabase/service.ts` uses `import "server-only"` and disables session
persistence/refresh. Service-role usage is concentrated in server modules and
server actions.

### Anon Client / Browser Writes

The following operational mutation files are client-side and use the browser
Supabase client:

- `lib/data/customerMutations.ts`
- `lib/data/inventoryMutations.ts`
- `lib/data/orderMutations.ts`
- `lib/data/posMutations.ts`
- `lib/data/productMediaMutations.ts`
- `lib/data/productMutations.ts`
- `lib/data/returnMutations.ts`
- `lib/data/shippingMutations.ts`
- `lib/data/shippingOriginMutations.ts`

This is not production-safe while development RLS policies allow anon writes.
Move these workflows to authenticated server actions or enforce strict
role-based RLS before launch.

## Sensitive Data Review

### Positive Findings

- PIN fields use password inputs in the UI.
- PIN hashes are not selected by general staff repositories.
- Bootstrap script does not print PINs or PIN hashes.
- Service-role key is not printed by environment diagnostics.
- Session cookie is HTTP-only.

### Risks

- Development and migration scripts can print operational warnings and errors.
  They should remain local-only and should not run in production.
- Several client-side mutation results may expose raw Supabase messages to admin
  UI. This can leak table/constraint details.

## Download Security

### Positive Findings

- Payroll and timecard download routes validate UUID-like IDs.
- Payroll routes require payroll permissions.
- Timecard PDF route requires `timekeeper.view_all`.
- File responses use `Cache-Control: no-store`.

### Correction Applied

Payroll CSV, XLSX, package, and period PDF route handlers now return generic
500 responses instead of raw exception messages.

## Environment Review

`.env.example` documents active `process.env` references:

- Supabase URL, anon key, and service role key
- staff session and lockout settings
- shipping-from fallback variables
- business timezone
- timekeeper rule settings

No real secrets were found in `.env.example`. `.env.local` was not inspected or
printed.

## Input Validation

### Positive Findings

- Payroll download and timecard PDF routes validate UUID-like IDs.
- Payroll period creation validates ISO dates and period type.
- Scheduling validates ISO dates, time format, time ranges, active staff, and
  shift conflicts.
- Timekeeper validates punch sequence and timecard state.
- Staff actions validate roles, employment statuses, PIN confirmation, PIN
  format, final active Owner safety, and target role management.

### Risks

- Some browser-side operational mutation modules rely on UI/client validation
  plus RLS rather than server-side validation.
- Some client mutation modules propagate raw Supabase messages.

## Error Handling

### Correction Applied

Payroll download endpoints now use safe generic user-facing 500 responses.

### Remaining Gaps

- Several client-side mutation modules return `error.message` to the UI.
- Scheduling/timekeeper repository formatting can include Supabase code/message
  details in user-facing results.
- Production should centralize error redaction by environment.

## Rate Limiting Review

Rate limiting is not implemented in this phase.

Endpoints/actions that should eventually be rate-limited:

- staff login and PIN validation
- change PIN
- owner bootstrap script usage
- payroll generation, package generation, PDF/CSV/XLSX exports
- POS checkout
- product/customer/order/search-heavy reads
- media uploads

## Security Headers Review

No application-level security headers were found in `next.config.ts`, `proxy.ts`,
or root layout.

Recommended before production:

- Content-Security-Policy
- X-Frame-Options or `frame-ancestors` CSP
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security
- `Cache-Control: no-store` for authenticated admin/staff pages and downloads

## Audit Logging

### Confirmed

- Login success/failure and lockout events write `staff_auth_events`.
- Logout writes auth events when a session is found.
- Staff profile, business title, role, location, employment status, lifecycle,
  permission update, and permission clone changes write audit logs.
- Payroll generation, refresh, approval, close, reopen, exports, PDFs, and
  package generation write payroll events.
- Scheduling and timekeeper server flows write domain events.

### Gaps

- Client-side POS, orders, returns, shipping, products, customers, inventory, and
  media writes have inconsistent actor attribution because they run through anon
  browser clients or development policies.
- Some audit writes use `staff_user_id: null` in client-side mutation modules.

## Critical Findings

1. Development RLS policies grant broad anon access across operational tables.
   These policies must not be used in production.
2. Many operational mutations still run client-side with the anon Supabase
   client. UI hiding is not sufficient protection when RLS is permissive.

## High Findings

1. Production security headers are not configured.
2. Several client-side mutation modules expose raw Supabase messages to UI.
3. Multi-table commerce operations remain sequential rather than transactional.
4. Route permission configuration is duplicated across guard/sidebar/staff
   module registries, creating drift risk.

## Medium Findings

1. Admin and staff pages do not have explicit no-store page caching headers.
2. Admin route protection is render-time through `AdminShell`, not middleware
   pre-checking.
3. Rate limiting is not implemented for login, exports, payroll generation, or
   large operational workflows.
4. Service-role client is correctly server-only, but it remains broadly used and
   should be reviewed per workflow before launch.

## Low Findings

1. Development scripts print operational summaries and should remain local-only.
2. `.env.example` is minimal and would benefit from production deployment notes.
3. Security documentation is spread across phase docs and should be consolidated
   into a launch runbook.

## Corrections Applied

- `app/api/admin/payroll/[id]/export/csv/route.ts`: generic failure response.
- `app/api/admin/payroll/[id]/export/xlsx/route.ts`: generic failure response.
- `app/api/admin/payroll/[id]/package/route.ts`: generic failure response.
- `app/api/admin/payroll/[id]/pdf/route.ts`: generic failure response.
- `lib/staff/staffActions.ts`: non-Owners cannot grant or clone reserved Owner
  governance permissions.

## Security Score

**58 / 100**

The application has a strong staff session foundation, server-side guards for
admin/staff pages, and protected payroll/timekeeper downloads. It is not yet
production-ready because development RLS and client-side operational writes can
bypass the intended staff permission model.

## Production Recommendation

**NOT READY**

Production launch should wait until:

1. development anon RLS policies are replaced with authenticated role-based RLS
   or server-only mutation boundaries
2. client-side operational writes are moved to server actions/RPCs
3. security headers and authenticated page caching controls are configured
4. raw Supabase errors are redacted from user-facing mutation results
5. high-risk multi-table writes are transaction-safe

## Verification Results

- `npm run lint`: pass.
- `npm run build`: initial sandbox run failed only because Google Fonts could
  not be fetched. Rerun with network access passed.
- SQL executed: no.
- Migrations created: no.
- Schema changes: no.
- Supabase data changes: no.
- Business logic changes: no intentional changes.
- Permission changes: one confirmed security fix preventing non-Owners from
  granting or cloning reserved ownership governance permissions.
- Commits made: no.
