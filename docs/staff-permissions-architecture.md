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
- Managing Partner
- Store Manager
- Assistant Manager
- Cashier
- Inventory Specialist
- Shipping & Fulfillment
- Customer Service
- Accounting
- Marketing & E-Commerce

Each employee starts from the default role template. Explicit employee
permission assignments in `staff_permission_assignments` can add or revoke
individual permissions.

Business titles are separate from security roles. A staff member may have the
business title `Managing Partner` while the permission engine uses the
`managing_partner` security role. Future titles such as Chief Operating Officer
can use the same security role if the permission template is still correct.

The legacy `manager` role remains supported for existing rows. New assignments
should use `store_manager` or `assistant_manager`.

## Executive Governance

Executive leadership uses employee numbers `0001-0099`.

- `0001` Eduardo Gomez: Owner.
- `0002` Felix Aleman: Managing Partner.

The Managing Partner receives Owner-level operational permissions, including
staff, scheduling, time off, availability, inventory, POS, orders, customers,
shipping, returns, products, reports, marketing, settings, and audit review.
The Owner remains the legal owner.

Reserved Owner-only governance permissions are prepared but do not expose UI:

- `ownership.transfer`
- `ownership.assign_owner`
- `ownership.remove_last_owner`
- `system.master_recovery`

## Route Protection

Admin routes are protected server-side through `AdminShell`, which calls the
central permission guard. The proxy stamps the current pathname into the request
headers so the guard can resolve the required permission for nested admin
routes. If a signed-in employee lacks permission, Next.js renders the admin
`forbidden.tsx` 403 page.

Sidebar filtering is only a convenience. It is not the security boundary.

## Special Rules

- The final active Owner cannot lose critical owner permissions.
- Managing Partners cannot modify or assign Owner roles.
- Managers cannot modify executive roles.
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
