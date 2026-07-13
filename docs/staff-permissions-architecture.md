# Phase 10.3 Staff Permissions Architecture

ASHE TOKUN is the retail company. AJAKO ORIGINALS and EDIBERE CREATION are not
internal departments inside ASHE TOKUN. In this commerce system they may appear
only as vendors, suppliers, manufacturers, or brands sold through the store.

## Permission Model

Roles are templates. Permissions are the source of authorization.

Example:

Owner -> products.read, products.edit, inventory.adjust, staff.permissions.manage,
settings.security

The application defines permissions in `lib/staff/permissions.ts`, groups in
`lib/staff/permissionGroups.ts`, role templates in
`lib/staff/roleTemplates.ts`, and helper/guard behavior in
`lib/staff/permissionHelpers.ts` and `lib/staff/permissionGuard.ts`.

## Role Templates

Default templates are:

- Owner
- Manager
- Cashier
- Inventory Specialist
- Shipping & Fulfillment
- Customer Service
- Accounting
- Marketing & E-Commerce

Each employee starts from the default role template. Explicit employee
permission assignments in `staff_permission_assignments` can add or revoke
individual permissions.

## Route Protection

Admin routes are protected server-side through `AdminShell`, which calls the
central permission guard. The proxy stamps the current pathname into the request
headers so the guard can resolve the required permission for nested admin
routes. If a signed-in employee lacks permission, Next.js renders the admin
`forbidden.tsx` 403 page.

Sidebar filtering is only a convenience. It is not the security boundary.

## Special Rules

- The final active Owner cannot lose critical owner permissions.
- Managers cannot modify Owners.
- Cashiers do not receive cost or settings permissions.
- Inventory Specialists do not receive accounting permissions.
- Accounting does not receive inventory adjustment or transfer permissions.

## Permission Changes And Audits

Permission updates and permission cloning write audit events to `audit_logs`
with:

- target employee
- permissions added
- permissions removed or applied
- changed by
- timestamp from the database

## Manual SQL

`supabase/migrations/phase-10-3-enterprise-permissions.sql` prepares the
database for employee permission overrides. It must be reviewed and executed
manually. No staff records are created or modified automatically by this phase.
