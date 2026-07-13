# Phase 9 Security Audit

Phase 9 commerce modules are wired for live Supabase development usage, but they still rely on temporary anonymous development policies. These policies are intentionally not production safe.

## Development Policy Files Reviewed

- `supabase/policies-pos-development.sql`
- `supabase/policies-orders-management-development.sql`
- `supabase/policies-customers-development.sql`
- `supabase/policies-returns-development.sql`
- `supabase/policies-inventory-development.sql`
- `supabase/policies-shipping-development.sql`
- `supabase/policies-shipping-origins-development.sql`
- `supabase/policies-products-admin-insert.sql`
- `supabase/policies-products-admin-update.sql`
- `supabase/policies-product-media-development.sql`
- `supabase/policies-media-assets-development.sql`
- `supabase/storage-policy-product-media.sql`

## Current Development Access Pattern

The development policies allow anonymous reads and writes for operational testing across POS, orders, customers, returns, inventory, shipments, shipping origins, media, and product management. This is acceptable only for local or private development validation.

Public read policies for storefront catalog data are narrower:

- Active brands
- Active categories
- Active collections
- Active product types
- Active traditions
- Active online products
- Active product media

## Customer And Address Data

Tables containing customer or address data:

- `customers`
- `customer_addresses`
- `orders`
- `shipments`
- `shipment_addresses`
- `returns`
- `receipts`
- `audit_logs`

These tables must require authenticated staff access before production. Customer addresses and shipment address snapshots are sensitive personal information.

## Financially Sensitive Tables

Financially sensitive tables:

- `orders`
- `order_items`
- `payments`
- `receipts`
- `returns`
- `return_items`
- `gift_cards`
- `inventory_items`
- `inventory_transactions`
- `products` because it includes `cost`
- `audit_logs`

Product `cost`, inventory valuation, payments, refunds, and customer lifetime value must not be exposed through public policies or storefront views.

## Policies To Replace Before Production

All `Anon can ...` development policies must be replaced before production. In particular:

- POS order/payment/receipt writes
- Customer read/write policies
- Customer address read/write/delete policies
- Order management update policies
- Return creation/completion policies
- Inventory item and transaction writes
- Shipping and shipment address policies
- Shipping origin management policies
- Product insert/update policies
- Media and storage upload/update/delete policies

## Authentication And Staff Roles Required

Production should introduce authenticated staff roles:

- `pos_staff`: create POS orders, payments, receipts, and sale inventory transactions.
- `admin_staff`: manage products, customers, orders, returns, shipments, media, and inventory.
- `manager`: approve sensitive actions and view cost/profit data.
- `owner`: full operational and security control.

Future RLS helpers should resolve staff identity and role from authenticated sessions, not from client-provided fields.

## Manager-Only Actions

These actions should require manager or owner access:

- Order cancellation
- Return completion
- Refund recording
- Inventory adjustment
- Inventory transfer
- Shipping-origin management
- Product cost edits
- Discount approval
- Gift card/store-credit issuance

## Audit Log Requirements

Audit logs are already written for several operational actions, but production should enforce audit writes through RPCs or server-side actions. Staff users should not be able to update or delete audit log history.

## Production Security Readiness

Status: Not production ready.

Required before production:

- Implement authentication.
- Add staff role resolution.
- Replace all anonymous development policies.
- Add public-safe views for storefront product data.
- Move sensitive writes into server actions or RPCs.
- Restrict cost, payments, addresses, inventory internals, and audit logs.
