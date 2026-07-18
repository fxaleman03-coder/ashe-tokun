# Phase 15B: POS Transaction RPC Activation and Wiring

Date: July 18, 2026
Project: ASHE TOKUN

## Executive Summary

The application checkout path has been wired to use the transactional POS RPC instead of the unsafe sequential multi-write sale path.

Phase 15B.5 connected to the linked production Supabase project and confirmed that the required Phase F4 transactional hardening migration is already present in remote migration history. No migration was reapplied.

Remote schema verification confirmed that the POS RPC, idempotency table, constraints, trigger, index, and execute grants exist remotely.

Sale completion containment remains enabled.

## Remote Migration State

Remote migration state was inspected with:

```sh
npx supabase@2.109.1 migration list
```

Findings:

- The linked project cache points to project ref `ovdjxjekoiaeyurqblfc`.
- `npx supabase@2.109.1 migration list` successfully connected to the remote database.
- Migration `20260715001300` is present locally and remotely.
- No duplicate migration version was reported for `20260715001300`.
- Migration `20260715001400` is also already present remotely. It was not applied during Phase 15B.5.
- Migration `20260715001500` exists locally and is not present remotely.
- No SQL was executed manually.
- No remote migration was applied during Phase 15B.5.
- No production data was modified.

## Migration Status

Required migration:

- `supabase/migrations/20260715001300_phase_f4_transactional_hardening.sql`

Status:

- Present locally.
- Inspected locally.
- Already applied remotely.
- Not reapplied by Phase 15B.5.

Remote migration history includes:

- `20260715000000`
- `20260715000100`
- `20260715000200`
- `20260715000300`
- `20260715000400`
- `20260715000500`
- `20260715000600`
- `20260715000700`
- `20260715000800`
- `20260715000900`
- `20260715001000`
- `20260715001100`
- `20260715001200`
- `20260715001300`
- `20260715001400`

Pending local migration not applied:

- `20260715001500`

## RPC Signature

Remote schema dump confirmed:

```sql
public.complete_pos_sale_transaction(
  p_request_key text,
  p_customer_id uuid,
  p_inventory_location_id uuid,
  p_cashier_name text,
  p_payment_method text,
  p_discount_type text,
  p_discount_value numeric,
  p_tax_rate numeric,
  p_amount_tendered numeric,
  p_notes text,
  p_items jsonb
) returns jsonb
```

Application mapping:

- `p_request_key`: generated server-side as `pos-sale-${randomUUID()}`
- `p_customer_id`: `input.customerId`
- `p_inventory_location_id`: `input.inventoryLocationId`
- `p_cashier_name`: `input.cashierName`
- `p_payment_method`: `input.paymentMethod`
- `p_discount_type`: `input.discountType`
- `p_discount_value`: `input.discountValue`
- `p_tax_rate`: validated incoming tax rate or active tax-rate fallback
- `p_amount_tendered`: `input.amountTendered`
- `p_notes`: `input.notes ?? null`
- `p_items`: cart items mapped to `[{ product_id, quantity }]`

## RPC Security Verification

Verified remotely from the production schema dump:

- Function uses `SECURITY DEFINER`.
- Function uses fixed `search_path = public, pg_temp`.
- Table references are schema-qualified.
- Execute is revoked from `PUBLIC`.
- Execute is granted to `service_role`.

Verified remotely by safe probes:

- Service-role RPC path reaches `complete_pos_sale_transaction(...)`.
- The RPC accepts the expected named parameters.
- A probe with an empty request key returned controlled PostgreSQL error `P0001`.
- A follow-up read confirmed no empty-key idempotency row was created.
- An anon RPC probe returned PostgreSQL `42501 permission denied for function complete_pos_sale_transaction`.

Not verified remotely:

- Authenticated-role denial was not directly probed because no authenticated user JWT was used for this database-only check.
- A full successful transaction was not executed because POS containment remains enabled and no controlled sale data was created.
- Duplicate idempotency, insufficient-stock, invalid-payment, and rollback behavior still require controlled transaction tests.

## Object Verification

Verified remotely:

- `public.complete_pos_sale_transaction(...)`
- `public.complete_return_transaction(...)`
- `public.finalize_shipment_transaction(...)`
- `public.transaction_idempotency_keys`
- `transaction_idempotency_keys_pkey`
- `transaction_idempotency_keys_workflow_request_key_key`
- `transaction_idempotency_keys_status_check`
- `transaction_idempotency_keys_workflow_check`
- `transaction_idempotency_keys_workflow_idx`
- `set_transaction_idempotency_keys_updated_at`

## Application Wiring Details

Modified in Phase 15B:

- `lib/data/posMutations.ts`

Changes:

- Kept the existing `launchContainment.posSaleCompletion` guard at the top of `completePosSale()`.
- Preserved staff authorization through `requireServerActionPermission("pos.checkout")`.
- Preserved existing pre-RPC validation:
  - Supabase mode required.
  - Cart cannot be empty.
  - Payment method must be cash, card, Zelle, or other.
  - Inventory location must exist and be active.
  - Products must exist.
  - Products must be active, active status, and available in store.
  - Product inventory rows must exist at the selected location.
  - Available quantity must cover the sale quantity.
  - Tendered amount must cover sale total.
- Replaced sequential writes with one RPC call to `complete_pos_sale_transaction`.
- Removed the production path that inserted or updated:
  - `orders`
  - `order_items`
  - `payments`
  - `receipts`
  - `inventory_items`
  - `inventory_transactions`
- Added safe RPC result mapping back to the existing `PosSaleResult` UI shape.
- Added safe handling for missing RPC errors.
- Revalidation remains after verified RPC success only.

## Sequential Fallback Status

The unsafe production sale completion path no longer performs sequential writes in `completePosSale()`.

There is no silent fallback from RPC failure to sequential inserts/updates.

Local preview behavior remains only for `USE_SUPABASE = false`.

## Containment Status

Containment remains enabled:

```ts
launchContainment.posSaleCompletion === true
```

The POS UI still disables Complete Sale and the Server Action still returns before auth, validation, RPC calls, or writes.

Live sale completion has not been enabled.

## Validation Results

Completed:

- Static migration inspection.
- Local RPC signature inspection.
- Local RPC security-source inspection.
- Remote migration history inspection.
- Remote schema dump filtered to Phase F4 transactional objects.
- Remote RPC existence verification.
- Remote RPC signature verification.
- Remote idempotency table existence verification.
- Remote anon denial probe.
- Remote service-role invocation path probe.
- Remote no-write follow-up check after empty-key probe.
- Application parameter mapping review.
- Static search confirming `completePosSale()` now calls `complete_pos_sale_transaction`.
- Static search confirming the old sequential POS write helpers are removed from `completePosSale()`.
- `npm run lint`.
- `npm run build`.

Not completed:

- Controlled transaction test.
- Idempotency duplicate-key test.
- Insufficient-stock RPC test.
- Invalid-payment RPC test.
- Rollback simulation.

Reason:

- Phase 15B.5 was limited to migration and object activation verification. It did not create test sales, modify inventory, or disable containment.

## Remaining Blockers

Critical:

- Run controlled RPC tests in a safe environment.
- Keep containment enabled until tests pass.
- Verify duplicate idempotency keys cannot create duplicate sales.
- Verify insufficient stock is rejected.
- Verify invalid payment methods are rejected.
- Verify a forced failure rolls back the entire transaction.
- Verify order, order item, payment, receipt, inventory transaction, and audit output from one controlled sale.

Deferred:

- Do not remove POS sale containment until controlled transaction tests pass.
- Confirm whether already-applied `20260715001400_phase_e_production_rls.sql` is expected in production launch state before any Phase E follow-up work.

## Phase 15C Requirements

Phase 15C can proceed to controlled RPC transaction testing, but POS live sale completion must remain contained until those tests pass.

Required Phase 15C inputs:

- Controlled test sale plan.
- Product/location inventory with positive available quantity for testing.
- Expected rollback/failure scenarios.
- Confirmation whether tests should run in production with controlled data or in a staging clone.

Phase 15C should then:

- Run controlled POS RPC tests.
- Verify idempotency.
- Verify rollback behavior.
- Verify insufficient-stock rejection.
- Verify invalid-payment rejection.
- Verify order, item, payment, receipt, inventory transaction, and audit outputs.
- Only after passing, decide whether to disable POS sale containment.
