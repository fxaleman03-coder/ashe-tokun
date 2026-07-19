# Phase 15G - Inventory Operations Containment Audit and Activation

## Executive Summary

ASHE TOKUN inventory transfers were already active through
`transfer_inventory_transaction(...)`, but three normal inventory operations
remained visibly contained in the Inventory Item Detail page:

- Adjust Inventory.
- Receive Inventory.
- Update Reorder Level.

The root cause was intentionally broad launch containment through
`launchContainment.inventoryWrites`. The existing adjust and receive server
actions used a secure server-side service client, but they updated
`inventory_items` and then inserted `inventory_transactions` as separate
sequential writes. That was not safe enough to activate in production because a
ledger failure after a quantity update could leave a partial write.

Phase 15G keeps the broad inventory write containment in place for unrelated
inventory creation, adds narrow containment switches for the three audited
operations, and activates only the production-safe paths.

## Operation Audit

### Adjust Inventory

- Current UI handler: `handleAdjustment()` in
  `components/admin/InventoryItemDetail.tsx`.
- Server action: `adjustInventory()` in `lib/data/inventoryMutations.ts`.
- Tables written: `inventory_items`, `inventory_transactions`,
  `transaction_idempotency_keys`.
- Previous write path: sequential service-role update plus ledger insert.
- Activated write path: `adjust_inventory_transaction(...)`.
- Security: server action requires `inventory.adjust`; RPC execute is granted
  only to `service_role`.
- Rollback protection: database function updates the stock row and ledger row
  in one transaction.
- Duplicate submission protection: UI pending state plus request key tracked in
  `transaction_idempotency_keys`.
- Validation:
  - nonzero integer quantity required.
  - valid adjustment reason required.
  - negative on-hand or available stock rejected.
  - reserved quantity rule preserved through `available = on_hand - reserved`.

### Receive Inventory

- Current UI handler: `handleReceive()` in
  `components/admin/InventoryItemDetail.tsx`.
- Server action: `receiveInventory()` in `lib/data/inventoryMutations.ts`.
- Tables written: `inventory_items`, `inventory_transactions`,
  `transaction_idempotency_keys`.
- Previous write path: sequential service-role update plus ledger insert.
- Activated write path: `receive_inventory_transaction(...)`.
- Security: server action requires `inventory.adjust`; RPC execute is granted
  only to `service_role`.
- Rollback protection: database function updates the stock row and ledger row
  in one transaction.
- Duplicate submission protection: UI pending state plus request key tracked in
  `transaction_idempotency_keys`.
- Validation:
  - positive integer quantity required.
  - receiving increments on-hand and available stock.
  - incoming quantity is reduced without going below zero.
  - receiving ledger row is created.

### Update Reorder Level

- Current UI handler: `handleReorderLevel()` in
  `components/admin/InventoryItemDetail.tsx`.
- Server action: `setReorderLevel()` in `lib/data/inventoryMutations.ts`.
- Tables written: `inventory_items`.
- Previous containment: broad `inventoryWrites` lock.
- Activated write path: secure server action using service-role repository
  boundary.
- Security: server action requires `inventory.adjust`.
- Rollback protection: not an inventory movement; only one non-quantity column
  is updated.
- Duplicate submission protection: UI pending state prevents repeated clicks.
- Validation:
  - zero or positive integer accepted.
  - negative and non-integer values rejected.
  - inventory quantities are not altered.

## RPCs and Migration

Migration applied:

- `supabase/migrations/20260715001800_phase_15g_inventory_operations_rpc.sql`

RPCs created:

- `adjust_inventory_transaction(p_request_key text, p_inventory_item_id uuid, p_quantity_change integer, p_transaction_type text, p_notes text, p_reference_type text, p_reference_id uuid, p_performed_by text)`
- `receive_inventory_transaction(p_request_key text, p_inventory_item_id uuid, p_quantity_received integer, p_notes text, p_reference_type text, p_reference_id uuid, p_performed_by text)`

Security verification:

- `SECURITY DEFINER`: verified.
- Fixed `search_path = public, pg_temp`: verified.
- `PUBLIC`, `anon`, and `authenticated` execute: revoked.
- `service_role` execute: granted.
- `transaction_idempotency_keys` workflow constraint includes
  `inventory_adjustment` and `inventory_receiving`.

## Files Modified

- `components/admin/InventoryItemDetail.tsx`
- `lib/data/inventoryMutations.ts`
- `lib/launchContainment.ts`
- `supabase/migrations/20260715001800_phase_15g_inventory_operations_rpc.sql`
- `docs/phase-15g-inventory-operations-activation.md`

## Validation

Local validation:

- `npm run lint`: PASS.
- `npm run build`: PASS.

Remote validation:

- Migration `20260715001800` applied through a targeted Supabase query.
- Migration history repaired for `20260715001800` only.
- Unrelated local-only migration `20260715001500` remains unapplied.
- RPC signatures verified remotely.
- RPC security verified remotely.
- Rollback-only validation executed against production:
  - adjust RPC executed inside an explicit transaction.
  - receive RPC executed inside an explicit transaction.
  - reorder-level update executed inside an explicit transaction.
  - transaction ended with `ROLLBACK`.
  - no inventory quantity or reorder-level changes persisted from validation.

## Production Safety

Adjust and receive are now atomic database operations and no longer use the old
sequential multi-write path. Reorder level remains a single-column, server-side
authorized update and does not alter inventory quantities.

The broad `inventoryWrites` flag remains `true` so unrelated inventory write
surfaces stay contained. Only the audited operation-specific flags were opened:

- `inventoryAdjustments: false`
- `inventoryReceiving: false`
- `inventoryReorderLevel: false`

## Remaining Blockers

No blocker remains for normal adjustment, receiving, transfer, or reorder-level
updates from the Inventory Item Detail page.

Full advanced inventory planning, forecasting, purchase-order automation, and
Phase 17 roadmap work remain deferred.
