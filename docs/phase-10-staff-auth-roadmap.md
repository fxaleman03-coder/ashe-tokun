# Phase 10 Staff Authentication Roadmap

Phase 10.1 creates a Staff Operations Portal foundation only. It does not enable real authentication, create staff users, store PINs, or protect operational routes.

Phase 10.2 introduces the real server-side PIN authentication foundation. Staff authentication uses a server-only Supabase service-role client, hashed PINs, HTTP-only session cookies, session revocation, lockout controls, and owner/manager staff management tools. The service role key must never be imported into Client Components or exposed through public environment variables.

## PIN Security Requirements

- PINs must be hashed server-side before storage.
- Plain PIN values must never be stored in Supabase, logs, browser storage, or client state beyond the active form field.
- Minimum PIN length should be at least 6 digits for store staff, with future support for stronger staff passwords or passkeys.
- Failed login attempts should increment `failed_login_attempts` and trigger `locked_until` after repeated failures.
- Lockout rules should be enforced server-side and should not rely on client-only checks.
- Staff sessions should expire after a fixed lifetime.
- Staff sessions should also expire after an inactivity timeout.
- Logout should revoke or invalidate the active session.

## Role And Permission Requirements

- Every protected route must check the active staff session.
- Staff permissions must be enforced server-side before sensitive actions.
- Managers and owners may receive broader access for refunds, discounts, overrides, and staff management.
- Cashiers should have limited access to POS, customer lookup, and order lookup.
- Inventory staff should have inventory and receiving access without customer/payment internals.
- Fulfillment staff should have shipping and order fulfillment access.
- Customer service staff should have customer, order, and return access.
- Staff deactivation must immediately prevent new sessions and should invalidate active sessions where possible.

## Audit And Device Requirements

- Staff actions should be attributed to a staff member in audit logs.
- POS actions, inventory adjustments, returns, refunds, shipment status changes, and manager overrides should be auditable.
- Device/session metadata should be recorded where practical.
- Manager override flows should require a second authorized staff identity.

## Recommended Phase Plan

### Phase 10.2

- Implement real PIN authentication.
- Validate credentials server-side.
- Create secure staff sessions.
- Add logout.
- Add inactivity timeout.
- Add lockout after repeated failures.
- Add PIN reset and must-change-PIN flows.
- Add owner bootstrap script.
- Protect `/staff` and `/admin/staff`.

### Phase 10.3

- Enforce roles and permissions.
- Protect `/staff` and operational routes.
- Add manager override flows.

### Phase 10.4

- Add action attribution.
- Expand audit trails for POS, inventory, orders, returns, and shipping.
- Add staff activity history and session/device logging.

## Dual Owner Recovery Rule

- Owners may reset another Owner's PIN.
- No Owner may view another PIN.
- PIN reset revokes active sessions for the target Owner.
- PIN reset creates a temporary PIN and sets `must_change_pin = true`.
- PIN reset actions must be audited.
- The system must never allow zero active Owners.
- Managers cannot manage Owner security.
