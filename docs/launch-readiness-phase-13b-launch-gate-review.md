# Launch Readiness Phase 13B: P0 Transactional Gate Review

Date: July 17, 2026

Scope: analysis only. Reviewed only the five Phase 13A P0 findings. No code, SQL, migrations, Supabase data, permissions, routes, or business logic were changed.

## Executive Conclusion

The five Phase 13A P0 findings are real transactional risks, but they are not all true blockers for the initial ASHE TOKUN website publication. The immediate public launch does not currently include public checkout, public payment, public shipment creation, or public returns. The P0 risks are concentrated in internal Store Operations workflows.

Revised recommendation: **READY AFTER CONTAINMENT**.

The full transactional RPC/permanent rewrite work can be deferred if the unsafe internal workflows are explicitly disabled or guarded server-side before deployment. Hiding navigation alone is not sufficient.

## Five-Row Gate Decision Table

| P0 Workflow | Root Cause | Affected Surface | Day-One Necessity | Containment Available | Fix Size | Final Gate Decision |
| --- | --- | --- | --- | --- | --- | --- |
| POS checkout | `completePosSale()` still performs direct multi-step writes and does not call the prepared `complete_pos_sale_transaction(...)` RPC. | Internal Store Operations only. Public checkout is not active. | Optional for initial launch | Yes: disable POS checkout server-side and hide/disable POS sale completion UI. | M for permanent RPC integration; XS/S for containment | MAY CONTAIN AND DEFER |
| Inventory changes/transfers | Adjust, receive, and transfer update inventory and ledger rows separately. Transfer updates source/destination separately. | Internal Store Operations; inventory integrity | Ordinary stock reads are required; unsafe writes are optional if starting inventory is loaded. | Yes: keep inventory read-only, disable adjust/receive/transfer server-side and UI. | M for permanent transactional inventory RPCs; S for containment | MAY CONTAIN AND DEFER |
| Shipment creation | `createShipment()` inserts shipment header, items, addresses, packages, events, and audit separately and does not call the prepared `finalize_shipment_transaction(...)` RPC. | Post-sale internal fulfillment | Not required if launch orders are handled manually outside the app or shipping module is disabled. | Yes: disable `/admin/shipping/new` and `createShipment()` server-side. | M for RPC integration; XS/S for containment | MAY CONTAIN AND DEFER |
| Returns completion | `completeReturn()` can restore inventory, record refunds/store credit/exchange audit, then fail before status update. It does not call prepared `complete_return_transaction(...)`. | Post-sale administration | Not required for initial launch if returns are handled manually and completion UI is disabled. | Yes: disable return completion server-side and hide completion actions. | M for RPC integration; XS/S for containment | MAY CONTAIN AND DEFER |
| Completed-order cancellation | `allowedTransitions.completed` permits `cancelled`; `cancelOrder()` restores inventory and ledger rows before status update. | Internal order administration | Cancelling completed orders is not required day one. | Yes: block completed-to-cancelled transition server-side. Pending/draft cancellation can remain. | L for permanent transactional reversal; XS for strict guard | MAY CONTAIN AND DEFER |

## Detailed Analysis

### 1. POS Checkout

Code path:

- Page: `app/admin/pos/page.tsx`
- Component: `components/admin/AdminPOS.tsx`
- Server action: `lib/data/posMutations.ts` -> `completePosSale()`
- Permission: `pos.checkout` through `requireServerActionPermission("pos.checkout")`
- Prepared RPC found: `supabase/migrations/20260715001300_phase_f4_transactional_hardening.sql` defines `public.complete_pos_sale_transaction(...)`
- Active RPC usage found: none in `lib/data/posMutations.ts`

Exact root cause:

`completePosSale()` validates the sale server-side, then inserts the order, order items, payment, receipt, inventory updates, and inventory transactions as separate Supabase writes. If a later write fails, the action can return a critical error after earlier rows already exist.

Actual risk:

- Partial order/payment/receipt records
- Inventory changed without complete sale history
- Ledger mismatch
- Duplicate sale risk because the active action has no server-side idempotency key
- Success is not returned when known later failures occur, but operational data may already be partially persisted

Affected surface:

Internal Store Operations POS only. Public e-commerce checkout was not found as an active route/workflow.

Initial-launch necessity:

**Optional for initial launch** if the first launch is public catalog plus small manually handled operations. POS is not required for public browsing.

Safe temporary containment:

- Remove or hide POS from visible admin navigation for non-required launch users.
- Render POS checkout as unavailable with clear copy if the route remains accessible.
- Add server-side enforcement in `completePosSale()` that returns a safe unavailable result before any write.
- Do not rely only on staff not clicking the button.

Smallest safe permanent fix:

Wire `completePosSale()` to `public.complete_pos_sale_transaction(...)`, including a server-generated idempotency key. Add smoke checks for successful sale, insufficient inventory, duplicate request key, and simulated failure behavior.

Implementation size:

- Containment: XS/S
- Permanent fix: M

Gate decision:

**MAY CONTAIN AND DEFER**

### 2. Inventory Changes and Transfers

Code path:

- Pages: `app/admin/inventory/page.tsx`, `app/admin/inventory/[id]/page.tsx`
- Component: `components/admin/InventoryItemDetail.tsx`
- Server actions: `lib/data/inventoryMutations.ts`
- Actions reviewed: `adjustInventory()`, `receiveInventory()`, `transferInventory()`
- Permissions: `inventory.adjust`, `inventory.transfer`
- Active RPC usage found: none

Exact root cause:

Inventory adjustment and receiving update `inventory_items` and then insert `inventory_transactions`. Transfer subtracts from the source item, updates/creates the destination item, then inserts transfer-out and transfer-in ledger rows. These writes are not atomic.

Actual risk:

- Quantity updated without a ledger row
- Transfer source decremented while destination update fails
- Transfer quantities changed while one or both ledger rows fail
- Inventory integrity can drift even though negative quantity checks exist

Affected surface:

Internal Store Operations and required inventory integrity. Public users are affected only indirectly if storefront availability depends on corrupted stock.

Initial-launch necessity:

Inventory reads and correct starting quantities are required. Day-one inventory writes are optional if launch inventory is loaded before production and operational adjustments/transfers are deferred.

Safe temporary containment:

- Keep inventory module read-only.
- Disable adjust, receive, and transfer controls.
- Add server-side unavailable guards at the beginning of `adjustInventory()`, `receiveInventory()`, and `transferInventory()` if these operations are deferred.
- Keep `setReorderLevel()` separate; it is a simple single-row update and not part of the P0 transactional issue.

Smallest safe permanent fix:

Create/use transactional inventory RPCs for adjustment, receiving, and transfer. Each RPC should lock affected inventory rows, validate quantities, update balances, and write ledger rows in one transaction.

Implementation size:

- Containment: S
- Permanent fix: M

Gate decision:

**MAY CONTAIN AND DEFER**

### 3. Shipment Creation

Code path:

- Page: `app/admin/shipping/new/page.tsx`
- Component: `components/admin/ShipmentCreationWizard.tsx`
- Server action: `lib/data/shippingMutations.ts` -> `createShipment()`
- Permission: `shipping.create`
- Prepared RPC found: `supabase/migrations/20260715001300_phase_f4_transactional_hardening.sql` defines `public.finalize_shipment_transaction(...)`
- Active RPC usage found: none in `lib/data/shippingMutations.ts`

Exact root cause:

`createShipment()` validates shipment input, then inserts the shipment header, shipment items, ship-from/ship-to address snapshots, packages, events, and audit rows separately. It returns critical manual-review errors when later inserts fail after a shipment exists.

Actual risk:

- Shipment header without shipment items
- Shipment without address snapshots
- Shipment without package rows
- Duplicate shipment creation if a retry follows a partial failure
- Inaccurate fulfillment state

Affected surface:

Internal post-sale fulfillment. It does not affect public browsing.

Initial-launch necessity:

**Optional for initial launch** if orders are manually fulfilled outside the application or shipping is deliberately unavailable at launch.

Safe temporary containment:

- Hide or disable the "Create Shipment" route and CTA.
- Add a server-side guard in `createShipment()` returning "Shipment creation is temporarily unavailable."
- Keep read-only shipping list/detail if existing data must be visible.

Smallest safe permanent fix:

Wire `createShipment()` or a new server action wrapper to `public.finalize_shipment_transaction(...)`, including a request key/idempotency value. Add smoke checks for normal shipping, local pickup, duplicate request, invalid origin, and over-fulfillment.

Implementation size:

- Containment: XS/S
- Permanent fix: M

Gate decision:

**MAY CONTAIN AND DEFER**

### 4. Returns Completion

Code path:

- Pages: `app/admin/returns/page.tsx`, `app/admin/returns/[id]/page.tsx`
- Component: `components/admin/ReturnDetailManager.tsx`
- Server action: `lib/data/returnMutations.ts` -> `completeReturn()`
- Permission: `returns.complete`
- Prepared RPC found: `supabase/migrations/20260715001300_phase_f4_transactional_hardening.sql` defines `public.complete_return_transaction(...)`
- Active RPC usage found: none in `lib/data/returnMutations.ts`

Exact root cause:

`completeReturn()` checks received status and duplicate restoration rows, then may restore inventory per item, insert a refund payment, create store credit, write exchange audit, and only afterward update the return to completed. These operations are not atomic.

Actual risk:

- Inventory restored while return remains received
- Refund/payment tracking recorded while completion fails
- Store credit created while return status update fails
- Manual retry risks duplicate or blocked recovery
- Restock/refund state can diverge from return status

Affected surface:

Post-sale internal administration.

Initial-launch necessity:

**Optional for initial launch** if returns are manually handled outside the app until transactional completion is enabled.

Safe temporary containment:

- Hide or disable return completion controls.
- Add server-side guard in `completeReturn()` before restoration/refund/store-credit work.
- Return creation/review can remain unavailable or read-only depending on launch policy.

Smallest safe permanent fix:

Wire completion to `public.complete_return_transaction(...)` or equivalent. Preserve existing server validation, idempotency, duplicate restoration checks, and manual refund messaging.

Implementation size:

- Containment: XS/S
- Permanent fix: M

Gate decision:

**MAY CONTAIN AND DEFER**

### 5. Completed-Order Cancellation

Code path:

- Pages: `app/admin/orders/page.tsx`, `app/admin/orders/[id]/page.tsx`
- Components: `components/admin/AdminOrdersManager.tsx`, `components/admin/OrderDetailActions.tsx`
- Server action: `lib/data/orderMutations.ts` -> `cancelOrder()`
- Permission: `orders.cancel`
- Transition table: `allowedTransitions.completed = ["cancelled"]`
- Active RPC usage found: none

Exact root cause:

The order transition table currently allows `completed -> cancelled`. When a completed order is cancelled, `cancelOrder()` reads POS sale transactions, restores inventory rows, inserts restoration ledger rows, then updates the order status to cancelled and writes audit. The catch message explicitly says a production RPC/database transaction is required.

Actual risk:

- Completed paid order can be cancelled without a true financial reversal workflow
- Inventory can be restored partially
- Ledger can fail after stock is updated
- Order status can remain completed after inventory restoration work
- Manual correction burden increases

Affected surface:

Internal order administration. It affects completed POS/order records, not public browsing.

Initial-launch necessity:

Completed-order cancellation is **not required for day one**. Cancelling draft or held orders may be useful, but cancelling completed orders should be blocked until a transactional reversal/refund workflow exists.

Safe temporary containment:

- Server-side: remove or block the `completed -> cancelled` transition.
- UI: hide or disable Cancel for completed orders with clear copy.
- Keep cancellation for draft/held orders if needed.

Smallest safe permanent fix:

For initial launch, the smallest safe correction is the server-side transition guard. A full permanent reversal workflow can come later and should be transactional, explicitly separate from simple cancellation.

Implementation size:

- Containment: XS
- Permanent reversal workflow: L

Gate decision:

**MAY CONTAIN AND DEFER**

## Recommended Implementation Order

1. Block completed-order cancellation server-side and hide/disable the completed-order cancel UI.
2. Disable POS sale completion server-side and in the POS UI unless POS is intentionally part of day-one operations.
3. Make Inventory Detail read-only by disabling adjust, receive, and transfer actions server-side and in the UI.
4. Disable shipment creation server-side and hide `/admin/shipping/new` entry points.
5. Disable return completion server-side and hide completion actions.
6. After launch, integrate prepared transactional RPCs for POS, shipment creation, and return completion.
7. After launch, create transactional inventory adjustment/receiving/transfer RPCs.
8. Later, design a completed-order reversal/refund workflow instead of reusing simple cancellation.

## Minimum Changes Required Before Deployment

These are containment changes, not full feature rewrites:

1. `lib/data/orderMutations.ts`: block `completed -> cancelled` before any inventory restoration work.
2. `components/admin/OrderDetailActions.tsx` and `components/admin/AdminOrdersManager.tsx`: do not present completed-order cancellation as available.
3. `lib/data/posMutations.ts`: add a launch-mode unavailable guard before any POS write if POS is deferred.
4. `components/admin/AdminPOS.tsx`: disable or replace sale completion with a clear unavailable state if POS is deferred.
5. `lib/data/inventoryMutations.ts`: add launch-mode unavailable guards to `adjustInventory()`, `receiveInventory()`, and `transferInventory()` if inventory writes are deferred.
6. `components/admin/InventoryItemDetail.tsx`: disable adjust, receive, and transfer controls if inventory writes are deferred.
7. `lib/data/shippingMutations.ts`: add a launch-mode unavailable guard to `createShipment()` if shipment creation is deferred.
8. `app/admin/shipping/new/page.tsx` and `components/admin/AdminShippingManager.tsx`: remove or disable creation entry points if shipment creation is deferred.
9. `lib/data/returnMutations.ts`: add a launch-mode unavailable guard to `completeReturn()` if returns completion is deferred.
10. `components/admin/ReturnDetailManager.tsx`: hide or disable completion controls if returns completion is deferred.

## Required Server-Side Enforcement for Containment

Containment is acceptable only if enforced in server actions, not only navigation:

- POS: `completePosSale()` must return before writes.
- Inventory: `adjustInventory()`, `receiveInventory()`, and `transferInventory()` must return before writes.
- Shipping: `createShipment()` must return before writes.
- Returns: `completeReturn()` must return before writes.
- Orders: `cancelOrder()` must reject completed orders before inventory lookup/restoration.

## Revised Launch Recommendation

**READY AFTER CONTAINMENT**

No full permanent transactional rewrite is required before publishing the initial website if the risky internal workflows are disabled or strictly guarded. The public site can launch once dead customer-facing checkout expectations are also handled by separate launch-readiness work.

## Validation

- SQL executed: No
- Migrations applied: No
- Data modified: No
- Code modified: No
- Commits created: No
- `npm run lint`: Passed
- `npm run build`: Passed after rerun with network access for Next.js Google font fetching. The first sandboxed build failed only because `next/font` could not fetch `Geist` and `Geist Mono`.
