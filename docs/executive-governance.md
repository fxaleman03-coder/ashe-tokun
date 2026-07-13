# ASHE TOKUN Executive Governance

Phase 10.4D separates ASHE TOKUN business leadership titles from staff security
roles. Business titles describe company authority and responsibility. Security
roles are permission templates used by the application.

ASHE TOKUN is the retail company. AJAKO ORIGINALS and EDIBERE CREATION are
vendors, suppliers, or manufacturers in the ASHE TOKUN commerce context. They
are not internal ASHE TOKUN departments and do not create ASHE TOKUN production
roles.

## Executive Hierarchy

- `0001` Eduardo Gomez: Owner.
- `0002` Felix Aleman: Managing Partner.

The Owner remains the legal owner of the business. The Managing Partner manages
daily operations and receives near-owner operational authority.

## Business Titles

Business titles are stored separately from security roles.

Examples:

- Business Title: Owner; Security Role: `owner`.
- Business Title: Managing Partner; Security Role: `managing_partner`.
- Business Title: Chief Operating Officer; Security Role: `managing_partner`.

Changing a business title must not grant or remove permissions by itself.

## Security Roles

Security roles remain permission templates. Effective permissions are still the
source of authorization.

Default executive templates:

- `owner`: legal ownership, all operational permissions, security governance,
  and reserved ownership permissions.
- `managing_partner`: all operational permissions currently assigned to Owner,
  except reserved ownership governance controls.

Operational templates:

- `store_manager`
- `assistant_manager`
- `inventory`
- `fulfillment`
- `customer_service`
- `cashier`
- `accounting`
- `marketing_ecommerce`

The legacy `manager` role remains supported for existing staff records until a
manual data cleanup moves those records to `store_manager` or
`assistant_manager`.

## Reserved Owner Actions

The reserved ownership permission group prepares future governance controls
without exposing UI yet:

- `ownership.transfer`
- `ownership.assign_owner`
- `ownership.remove_last_owner`
- `system.master_recovery`

These permissions belong only to the Owner template. The Managing Partner does
not receive them by default.

## Managing Partner Authority

The Managing Partner can operate the business across staff, scheduling, time
off, availability, inventory, POS, orders, customers, shipping, returns,
products, reports, marketing, settings, and audit review.

The Managing Partner cannot modify or assign the Owner role and does not receive
reserved ownership governance permissions.

## Future Expansion

Future role additions should keep the same separation:

- Business title describes organization structure.
- Security role controls permission templates.
- Explicit permission assignments remain the actual authorization source.

Likely future business titles:

- Store Manager
- Regional Manager
- Additional Partner
- Chief Operating Officer

Likely future security templates:

- Regional Manager
- Store Manager
- Assistant Manager

Do not create ASHE TOKUN manufacturing roles for AJAKO ORIGINALS or EDIBERE
CREATION. Those belong to their own future ERP systems.
