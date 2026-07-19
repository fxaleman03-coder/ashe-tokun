# Phase 15C: Controlled POS Transaction Validation

Date: July 18, 2026
Project: ASHE TOKUN

## Historical Note

This document preserves the controlled validation status at the time of Phase
15C. Later phases completed production code parity, live POS activation,
inventory activation, and receipt-printing workflow updates.

## Executive Summary

The production POS transactional RPC was validated through the backend service-role path while application sale containment remained enabled.

One controlled cash sale was completed by direct RPC invocation, then duplicate idempotency, insufficient stock, invalid payment, and rollback/failure scenarios were verified.

The successful validation sale created a real production order and decremented inventory by one unit. No POS UI containment was disabled.

## Containment Status

Confirmed in source:

```ts
launchContainment.posSaleCompletion === true
```

Containment remains active in:

- `components/admin/AdminPOS.tsx`
- `lib/data/posMutations.ts`

The UI sale-completion path remains blocked. These tests used direct service-role RPC invocation for controlled database validation only.

## Test Inputs

Test run:

- `phase-15c-75c27d0d-8bd5-4992-b1ad-c5f7c4c57a2f`

Selected product and inventory:

- Product: `Ireme Keychain`
- SKU: `AJO-KEY-003`
- Product ID: `f3ad0be9-899c-436d-ae0d-3528415dcd97`
- Location: `Main Stockroom`
- Location ID: `a7247d88-f757-4945-aceb-22afda148172`
- Inventory item ID: `2856c097-7d5e-451e-9b7e-71dd179a185a`
- Starting on hand: `16`
- Starting available: `16`

Sale parameters:

- Quantity: `1`
- Payment method: `cash`
- Discount type: `none`
- Discount value: `0`
- Tax rate: `0`
- Amount tendered: `44`

## Successful Sale

Result: PASS

RPC result:

- Order ID: `be65b17c-f52e-43f4-82e7-00f283e12656`
- Order number: `ASH-ORD-000004`
- Receipt number: `ASH-000004`
- Payment status: `paid`
- Subtotal: `$44.00`
- Discount: `$0.00`
- Tax: `$0.00`
- Total: `$44.00`
- Amount tendered: `$44.00`
- Change due: `$0.00`

Verified records:

- Order created.
- One order item created.
- One cash payment created.
- One receipt created.
- One inventory transaction created.
- One audit record created with action `pos_sale_completed`.

Inventory verification:

- Before: on hand `16`, available `16`
- After: on hand `15`, available `15`
- Quantity change: `-1`
- Balance after: `15`

## Duplicate Idempotency Key

Result: PASS

The same request key was submitted again:

- `phase-15c-75c27d0d-8bd5-4992-b1ad-c5f7c4c57a2f-success`

Verified behavior:

- The RPC returned the original result.
- The returned order ID remained `be65b17c-f52e-43f4-82e7-00f283e12656`.
- No additional order item was created.
- No additional payment was created.
- No additional receipt was created.
- No additional inventory transaction was created.
- Inventory remained on hand `15`, available `15`.

## Insufficient Stock

Result: PASS

Failure probe:

- Requested quantity greater than available stock.

Verified behavior:

- RPC returned PostgreSQL error code `P0001`.
- Inventory remained on hand `15`, available `15`.
- No idempotency row remained for the failed request key.
- No partial inventory corruption was observed.

## Invalid Payment Method

Result: PASS

Failure probe:

- Payment method: `bitcoin`

Verified behavior:

- RPC returned PostgreSQL error code `P0001`.
- Inventory remained on hand `15`, available `15`.
- No idempotency row remained for the failed request key.
- No partial inventory corruption was observed.

## Rollback Simulation

Result: PASS

Failure probe:

- Valid product and location.
- Invalid random customer ID to force a database failure during order creation.

Verified behavior:

- RPC returned PostgreSQL error code `P0001`.
- Inventory remained on hand `15`, available `15`.
- No idempotency row remained for the failed request key.
- No order with rollback validation notes was found.
- No partial order was observed.

## Validation Matrix

| Test | Result | Notes |
| --- | --- | --- |
| Successful sale | PASS | Order, item, payment, receipt, inventory transaction, and audit were created. |
| Duplicate idempotency key | PASS | Replayed request returned original result without duplicate writes. |
| Insufficient stock | PASS | Failure left inventory unchanged and no idempotency row remained. |
| Invalid payment method | PASS | Failure left inventory unchanged and no idempotency row remained. |
| Rollback simulation | PASS | Forced failure left no order and no inventory change. |

## Remaining Blockers

No Phase 15C transactional blockers remain.

Before Phase 15D enables live POS completion:

- Decide whether the controlled validation order should remain as an audit trail or be handled operationally.
- Confirm storefront/admin operators understand POS containment will be removed in Phase 15D only.
- Run one final UI-level checkout after containment is intentionally disabled in Phase 15D.

## Recommendation

ASHE TOKUN is ready for Phase 15D planning.

Phase 15D may remove POS sale containment and perform the first UI-driven live sale only after approval.
