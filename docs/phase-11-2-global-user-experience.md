# Phase 11.2 Global User Experience

Phase 11.2 standardizes the signed-in ASHE TOKUN administration experience without changing commerce, payroll, timekeeper, scheduling, or catalog business logic.

## Scope

- Shared Admin header with breadcrumbs, notifications foundation, and authenticated user menu.
- Shared Staff Portal header with ASHE TOKUN identity, employee context, and the same authenticated user menu.
- One canonical staff logout server action.
- Permission-aware Admin dashboard quick actions.
- Shared page header and breadcrumb building blocks for future modules.
- Translation keys for the new global labels in English, Spanish, and Yoruba.

## Logout Architecture

The global Sign Out action calls the existing staff session invalidation service through `lib/staff/staffLogoutAction.ts`.

The action:

- revokes the current staff session when available
- records the existing logout auth event through the current auth service
- clears the HTTP-only staff session cookie
- redirects to `/staff/login?status=logged_out`

Cookie mutation remains in a server action. Server components and route guards continue to use read-only session validation.

## Admin Header

`AdminShell` now renders `AdminHeader` for every admin route. The header includes:

- route-aware breadcrumbs
- page title and description
- notification foundation
- authenticated staff menu

The staff menu shows display name, employee number, business title, and security role. Profile links use the existing staff profile route.

## Staff Header

The Staff Portal header keeps the staff operations identity and language selector, then uses the shared authenticated user menu for account actions.

The previous standalone logout button was removed to avoid duplicate sign-out controls.

## Notification Foundation

`NotificationCenter` is UI-only in this phase. It does not create persisted notifications, realtime subscriptions, or synthetic alert data.

Until real derived alerts are provided, it shows the empty state:

`No new notifications`

## Dashboard Quick Actions

The Admin dashboard now prepares permission-aware quick actions:

- New Employee
- Create Payroll Period
- Create Schedule
- Add Product
- Receive Inventory
- Open POS

Actions are hidden when the current staff member lacks the required permission.

## Known Limitations

- Account Settings and Activity Log are displayed as unavailable menu entries until dedicated pages exist.
- Notifications are visual foundation only.
- Breadcrumb dynamic labels intentionally avoid raw UUIDs but do not yet fetch record names for every route.
- No database schema, SQL policy, or seed data is introduced in this phase.
