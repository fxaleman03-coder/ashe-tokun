# Phase 9 Commerce Closeout

Phase 9 connected ASHE TOKUN commerce operations across POS, orders, customers, returns, inventory, shipping, and fulfillment. The system is ready for controlled development validation, but not production launch.

## Completed Modules

- POS sale workflow with customer selection, stock validation, discounts, tax, payment record, receipt record, and inventory deduction.
- Orders list/detail with operational status controls, notes, returns, shipments, receipts, payments, and timeline context.
- Customer management with individual and company display, primary contact handling, address management, purchase history, and protected Walk-in Customer rules.
- Return workflow with request, approval, receive, completion, restock logic, refund/store-credit/exchange administrative tracking, and order/customer visibility.
- Inventory live stock control, multi-location inventory records, inventory ledger rows, and transfer foundation.
- Shipping and fulfillment with shipment records, shipment items, packages, address snapshots, carrier/tracking fields, local pickup path, and shipping origins.
- Multi-origin shipping support for ASHE TOKUN, AJAKO ORIGINALS, and EDIBERE CREATION.

## Verified By Code Audit

- Walk-in Customer remains the default POS customer.
- Active customer search excludes deactivated customers in POS data.
- POS product lookup supports name, SKU, barcode, and brand.
- POS quantity cannot exceed selected-location availability.
- POS discounts and tax are calculated in cents and allocated across line items.
- Cash tendered and change due are calculated before sale write.
- POS sale success is returned only after order, items, payment, receipt, inventory updates, and ledger writes complete.
- Order cancellation checks for existing restoration rows and avoids double restoration.
- Cancelled orders are excluded from customer lifetime value and order revenue metrics.
- Returnable quantity subtracts completed returned quantities.
- Completed restockable returns restore inventory; damaged/non-restockable returns do not restore sellable inventory.
- Shipment fulfillable quantity excludes cancelled shipments, making cancelled shipment quantities fulfillable again.
- Shipping creation keeps Ship From and Ship To as separate snapshots.
- Shipping wizard now uses guided Continue/Back navigation.
- Shipping wizard now stores carrier, service level, tracking number, tracking URL, shipping cost, and packages.
- Local pickup hides shipping-only package/carrier requirements and stores pickup notes.

## Issues Fixed In Phase 9.6

- Removed temporary Supabase read/save diagnostics that printed during normal builds or admin use.
- Removed Product Studio price and Custom Opele diagnostic UI.
- Restricted Shipping Creation Wizard Ship From options to active and complete origins.
- Added Zelle as a supported POS administrative payment method.
- Set local pickup shipment package count to `0` instead of `1`.

## Cross-Module Issues Found

- POS, order cancellation, return completion, shipping creation, and inventory transfers are still sequential client-side writes. They report partial failures, but they need PostgreSQL RPC/database transactions before production.
- Number generation is format-based and collision-retry based in development. Production should use database sequences or RPC-controlled counters.
- No automated controlled live transaction was created in this audit because Phase 9.6 explicitly forbids creating, cancelling, or returning live test orders automatically.

## Source Status Audit

`USE_SUPABASE` is currently `true`.

Expected live Supabase source areas:

- Products
- Media
- Inventory
- POS
- Orders
- Customers
- Returns
- Shipments
- Shipping origins

Safe fallback support remains for catalog/media/inventory and local disabled states remain for live write modules when Supabase is unavailable.

Unexpected fallback usage found by code review: none requiring removal. Any runtime fallback should be investigated from the relevant admin source status panels.

## Numbering Audit

Current numbering formats:

- Customers: `ASH-CUS-000001`
- Orders: `ASH-ORD-000001`
- Receipts: `ASH-000001`
- Returns: `ASH-RET-000001`
- Shipments: `ASH-SHP-000001`
- Store credit: `ASH-CR-000001` derived from return number

Collision handling exists for POS order and receipt insert retries and return creation retries. Customer and shipment numbering still need sequence/RPC hardening before production.

## Security Summary

See `docs/phase-9-security-audit.md`.

Phase 9 still uses development anonymous RLS policies for operational modules. These must be replaced with authenticated staff role policies before production.

## Atomicity Summary

See `docs/phase-9-atomicity-audit.md`.

The main production blocker is transactional consistency. Commerce writes should move into RPCs so each workflow commits or rolls back as one unit.

## Known Limitations

- No real payment terminal or payment processor integration.
- No online checkout.
- No real carrier rates.
- No label purchase.
- No carrier tracking webhooks.
- No authenticated staff roles.
- No manager approval workflow.
- No printer or cash drawer integration.
- No transactional RPCs yet.
- Store credit exists as gift-card style administrative tracking only.
- Exchange flow is administrative and does not create replacement orders yet.

## Production Hardening Required

- Implement authentication and role-based RLS.
- Replace all development anonymous policies.
- Move POS, cancellation, return completion, shipment creation, and inventory transfers into RPC transactions.
- Add database sequence/RPC numbering.
- Add real payment provider integration.
- Add carrier/rate/label integration.
- Add receipt and packing slip print integrations.
- Add manager-only controls for cancellations, refunds, adjustments, and shipping-origin management.

## Recommended Next Phase

Phase 10 should focus on production hardening:

1. Authentication and staff roles.
2. RPC transaction boundaries.
3. Production RLS replacement.
4. Number sequence/RPC foundation.
5. Payment and carrier integration planning.

## Closeout Status

Phase 9 is ready to close for development foundation purposes.

Phase 9 is not ready for production operation until security, RLS, and transaction hardening are complete.
