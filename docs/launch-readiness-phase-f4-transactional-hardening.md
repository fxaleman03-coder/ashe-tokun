# Launch Readiness Phase F.4: Transactional Database Hardening

Date: July 14, 2026

Scope: Prepare transaction-safe database functions for POS sale completion, return completion/restock, and shipment creation/finalization.

No SQL was executed. No migrations were applied. No schema or Supabase data was modified. No test sales, returns, or shipments were created.

## Executive Summary

Phase F.4 prepares a review-only migration for the remaining multi-step operational workflows. The current Server Actions are already staff-authenticated and server-side after Phases F.2 and F.3, but they still perform sequential writes. The prepared migration introduces database functions that can eventually make those workflows succeed completely or fail completely.

Prepared migration:

- `supabase/migrations/phase-f4-transactional-hardening.sql`

Prepared functions:

- `complete_pos_sale_transaction(...)`
- `complete_return_transaction(...)`
- `finalize_shipment_transaction(...)`

The application has not been switched to these functions. The system must not be called transaction-safe until the migration is manually run, Server Actions are switched to RPC calls, and rollback scenarios are tested.

## POS Current Write Sequence

Current Server Action:

- `lib/data/posMutations.ts`
- `completePosSale(input)`
- Permission: `pos.checkout`

Current sequence:

1. Validate Supabase mode and staff permission.
2. Validate cart is not empty.
3. Validate payment method.
4. Validate inventory location is active.
5. Load products from `products`.
6. Validate each product is active, `status = active`, and `available_in_store = true`.
7. Load each inventory row from `inventory_items`.
8. Validate available quantity.
9. Calculate authoritative subtotal, discount, tax, total, tendered amount, and change due.
10. Insert `orders`.
11. Insert `order_items`.
12. Insert `payments`.
13. Insert `receipts`.
14. Update `inventory_items`.
15. Insert `inventory_transactions`.
16. Revalidate POS and order paths.

Tables written:

- `orders`
- `order_items`
- `payments`
- `receipts`
- `inventory_items`
- `inventory_transactions`

Failure points:

- Duplicate order or receipt number.
- Order items fail after order insert.
- Payment insert fails after order/items insert.
- Receipt insert fails after payment insert.
- Inventory update fails after commerce records exist.
- Ledger insert fails after quantity update.

Current rollback behavior:

- No automatic database rollback across all steps.
- The Server Action returns a critical manual-review result if an order has already been created.

Duplicate-submit risk:

- Existing unique order/receipt numbers prevent duplicate number reuse.
- No durable request key exists in the live flow yet.

## Return Current Write Sequence

Current Server Action:

- `lib/data/returnMutations.ts`
- `completeReturn(returnId, completionInput)`
- Permission: `returns.complete`

Current sequence:

1. Validate Supabase mode and staff permission.
2. Load return record.
3. Validate transition to `completed`.
4. Require current return status to be `received`.
5. Check for existing `Customer Return` inventory ledger rows.
6. Load return items.
7. For each restockable item:
   - locate original sale inventory item using sale ledger rows
   - update `inventory_items`
   - insert `inventory_transactions`
8. For refund returns:
   - validate refund method and amount
   - insert a `payments` row with `payment_status = refunded`
9. For store-credit returns:
   - validate credit amount
   - insert `gift_cards`
10. For exchange returns:
   - insert audit metadata
11. Update `returns.status` to `completed`.
12. Insert return audit row.

Tables written:

- `inventory_items`
- `inventory_transactions`
- `payments`
- `gift_cards`
- `returns`
- `audit_logs`

Failure points:

- One item restock succeeds and a later item fails.
- Payment/gift card insert succeeds and return status update fails.
- Return status update fails after inventory restoration.

Current rollback behavior:

- No automatic rollback across all steps.
- The Server Action returns a critical manual-review result when completion partially fails.

Duplicate-restock risk:

- Existing live logic checks for prior `inventory_transactions` rows with `reference_type = Customer Return`, `reference_id = returnId`, and `transaction_type = return`.
- This prevents a second completion from restoring inventory again in normal cases.

## Shipping Current Write Sequence

Current Server Action:

- `lib/data/shippingMutations.ts`
- `createShipment(input)`
- Permission: `shipping.create`

Current sequence:

1. Validate Supabase mode and staff permission.
2. Validate order exists and is not cancelled.
3. Validate fulfillment type.
4. Validate selected item quantities against remaining fulfillable quantities.
5. Validate shipping origin, ship-to address, packages, and carrier for shipping fulfillment.
6. Generate shipment number.
7. Insert `shipments`.
8. Insert `shipment_items`.
9. For shipping fulfillment:
   - insert `shipment_addresses`
   - insert `shipment_packages`
10. Insert `shipment_events`.
11. Insert audit row.

Tables written:

- `shipments`
- `shipment_items`
- `shipment_addresses`
- `shipment_packages`
- `shipment_events`
- `audit_logs`

Failure points:

- Shipment insert succeeds but item insert fails.
- Item insert succeeds but address/package insert fails.
- Event/audit insert fails after shipment records exist.

Current rollback behavior:

- No automatic rollback across all steps.
- The Server Action returns a critical manual-review result when a shipment was created but dependent rows failed.

Duplicate-shipment risk:

- Current validation checks remaining fulfillable quantities, but no durable request key exists in the live flow yet.

## Atomic Function Design

The prepared migration adds:

- a shared `transaction_idempotency_keys` table
- `complete_pos_sale_transaction(...)`
- `complete_return_transaction(...)`
- `finalize_shipment_transaction(...)`

Design rules:

- Each function executes inside the single transaction created by the Postgres function call.
- Each function returns JSON.
- Each function raises safe exceptions for invalid status, invalid input, or integrity failures.
- Each function uses schema-qualified table names.
- Each function uses `SECURITY DEFINER` and explicit `search_path`.
- Execute is revoked from `PUBLIC`, `anon`, and `authenticated`.
- Execute is granted only to `service_role`.

## Idempotency Design

Prepared support table:

- `transaction_idempotency_keys`

Fields:

- `workflow`
- `request_key`
- `status`
- `entity_id`
- `result`

POS:

- Requires a non-empty request key.
- Replays the prior successful JSON result when the same key is completed.
- Prevents duplicate active processing once an entity is associated.

Returns:

- Accepts an optional request key.
- Also uses return status and existing restoration ledger rows to prevent duplicate restock.

Shipping:

- Requires a non-empty request key.
- Replays the prior successful JSON result for duplicate completed requests.
- Locks order items while validating remaining fulfillable quantity.

## Inventory Integrity

POS:

- Locks matching `inventory_items` rows with `FOR UPDATE`.
- Rejects insufficient available stock.
- Rejects negative on-hand or available quantities.
- Writes matching sale ledger rows.

Returns:

- Restores only items explicitly marked for restock.
- Restores only conditions `unopened` or `sellable`.
- Rejects duplicate restock based on prior return ledger rows.
- Writes matching return ledger rows.

Shipping:

- Does not change inventory because current shipping behavior does not deduct or reserve stock.
- Locks order item rows while checking already fulfilled quantities.

## Money And Total Integrity

POS:

- Recalculates subtotal from current product prices.
- Applies current discount semantics: none, percentage, fixed.
- Recalculates tax from the supplied tax rate.
- Rejects tendered amount lower than total.
- Stores money as numeric dollar amounts after cent-level calculation.

Returns:

- Preserves current refund amount bounds.
- Preserves store-credit amount bounds.
- Does not add payment-provider logic.

## Status Transition Rules

POS:

- The prepared function creates a completed POS order atomically.
- There is no existing pending POS sale table, so duplicate completion protection depends on request keys.

Returns:

- Only `received` returns can complete.
- `completed` and `cancelled` returns cannot complete again.

Shipping:

- Only non-cancelled orders can create shipments.
- Shipment creation starts at current status `pending`.
- Final status transitions remain in existing `updateShipmentStatus()` until future RPC expansion.

## Security Definer Controls

Prepared controls:

- `SECURITY DEFINER`
- `set search_path = public, pg_temp`
- schema-qualified DML
- no dynamic SQL
- `revoke execute ... from public, anon, authenticated`
- `grant execute ... to service_role`

Expected caller:

- Server Actions using `createSupabaseServiceClient()` after staff auth and permission checks.

These functions must not be exposed directly to browser clients.

## Audit And Event Atomicity

POS:

- Prepared function writes `pos_sale_completed` audit row inside the transaction.

Returns:

- Prepared function writes return completion and exchange audit rows inside the transaction.

Shipping:

- Prepared function writes shipment event and audit rows inside the transaction.

## Server Action Integration Plan

Do not switch live code yet.

Future POS adapter:

- Generate a stable request key in `completePosSale`.
- Map existing `PosSaleInput` to RPC arguments.
- Call `complete_pos_sale_transaction`.
- Map returned JSON to existing `PosSaleResult`.
- Keep the current sequential path behind a temporary feature flag until RPC testing passes.

Future return adapter:

- Generate/pass a stable completion key in `completeReturn`.
- Map existing `ReturnCompletionInput` to RPC JSON.
- Call `complete_return_transaction`.
- Map returned JSON to existing `ReturnResult`.
- Remove sequential restock/payment/store-credit/status writes after RPC verification.

Future shipment adapter:

- Generate a stable request key in `createShipment`.
- Map existing `CreateShipmentInput` to RPC arguments.
- Call `finalize_shipment_transaction`.
- Map returned JSON to existing `ShippingMutationResult`.
- Remove sequential shipment/item/address/package/event writes after RPC verification.

## Rollback Verification Expectations

POS:

- If payment insert fails, no order, order item, receipt, inventory update, or ledger row remains.
- If inventory deduction fails, no commerce records remain.
- If receipt insert fails, no order/payment/inventory records remain.

Returns:

- If one item restock fails, no inventory rows or ledger rows are changed.
- If refund metadata fails, no restock/status changes remain.
- If status update fails, no refund/store-credit/restock state remains.

Shipping:

- If package insert fails, no shipment/items/addresses/events remain.
- If event insert fails, no shipment records remain.

## Manual Activation Order

Future activation only:

1. Backup Supabase.
2. Review `supabase/migrations/phase-f4-transactional-hardening.sql`.
3. Run transaction migration in development.
4. Verify functions exist.
5. Switch POS Server Action to RPC.
6. Test POS sale.
7. Switch Return Server Action to RPC.
8. Test return completion/restock.
9. Switch Shipping Server Action to RPC.
10. Test shipment finalization.
11. Verify rollback scenarios.
12. Verify audit/event rows.
13. Run lint/build.
14. Apply production RLS hardening only after all active writes are server/RPC safe.

## Rollback Plan

The prepared migration includes commented rollback statements:

- revoke service-role execute grants
- drop the prepared functions
- drop `transaction_idempotency_keys`

Do not run rollback statements without backup and manual review.

## Remaining Risks

- The migration has not been executed or integration-tested.
- Server Actions still use the sequential path until future activation.
- Function input payloads must be validated against live UI payloads before switching.
- Order, receipt, shipment, and credit number generation still use max-plus-one logic and should be load-tested for concurrency.
- Shipment status update/finalization beyond creation remains outside the prepared shipping creation function.
- Return creation and return receiving remain sequential but have lower partial-write risk than completion.

## Production Recommendation

Do not claim transaction-safe operations yet. The current system is server-side and permission-checked, but these workflows become transaction-safe only after:

1. the migration is reviewed and manually applied,
2. Server Actions are switched to the RPC functions,
3. rollback scenarios are tested,
4. Phase E production RLS is reviewed against the final active write paths.
