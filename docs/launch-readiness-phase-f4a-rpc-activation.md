# Launch Readiness Phase F.4A: RPC Activation Checkpoint

Date: July 14, 2026

Scope: Compatibility audit and activation checkpoint for transactional RPC development activation.

No SQL was executed. No migrations were applied. No Supabase data was modified. No test sales, returns, shipments, or uncontrolled records were created. Server Actions were not switched to RPC calls.

## Executive Summary

Phase F.4A reached the pre-execution gate and stopped before migration execution because no safe database backup/export checkpoint was available from local project context.

Per the Phase F.4A instructions, the migration must not be executed and Server Actions must not be switched until:

1. the compatibility audit is clean,
2. the current development Supabase project is confirmed,
3. a database backup/export checkpoint is created or confirmed,
4. the user confirms the migration was executed successfully in development.

## Development Checkpoint

Development project reference:

- `ovdjxjekoiaeyurqblfc`

Environment status:

- Supabase URL present: yes
- Service role key present: yes
- Secrets printed: no

Activation timestamp recorded:

- `2026-07-14T23:42:09Z`

Current Git commit:

- `f6684fc7267993b6bedc47be5b62d9653151ac9a`

Backup/checkpoint status:

- Blocked. No local backup/export/checkpoint reference was found in `supabase/` or `docs/`.
- Because no safe backup/checkpoint was available, no SQL was executed.

## Compatibility Findings

Reviewed:

- `supabase/migrations/phase-f4-transactional-hardening.sql`
- `supabase/schema.sql`
- `supabase/migrations/phase-9-5-shipping.sql`
- `supabase/migrations/phase-9-5a-shipping-origins.sql`
- `lib/data/posMutations.ts`
- `lib/data/returnMutations.ts`
- `lib/data/shippingMutations.ts`
- Phase F/F.2/F.3/F.4 docs

No generated Supabase TypeScript database type file was found in the repo.

### POS Schema Compatibility

Referenced tables and columns exist in current SQL sources:

- `orders`: `id`, `order_number`, `customer_id`, `sales_channel`, `order_status`, `payment_status`, `subtotal`, `discount_total`, `tax_total`, `grand_total`, `notes`
- `order_items`: `order_id`, `product_id`, `sku`, `product_name`, `brand_name`, `quantity`, `unit_price`, `discount`, `tax`, `line_total`
- `payments`: `order_id`, `payment_method`, `amount`, `reference_number`, `payment_status`, `received_at`
- `receipts`: `order_id`, `receipt_number`, `printed`, `emailed`
- `inventory_items`: `product_id`, `location_id`, `on_hand_quantity`, `reserved_quantity`, `available_quantity`, `inventory_value`
- `inventory_transactions`: `inventory_item_id`, `transaction_type`, `reference_type`, `reference_id`, `quantity_change`, `balance_after`, `notes`, `performed_by`
- `audit_logs`: `staff_user_id`, `action`, `entity_type`, `entity_id`, `details`

Corrections applied to the unexecuted migration:

- Removed unused `v_receipt_id`.
- Removed unused `v_brand_name`.
- Added missing product existence check in the insert loop.
- Replaced raw `sqlerrm` exception messages with generic safe messages.

### Return Schema Compatibility

Referenced tables and columns exist in current SQL sources:

- `returns`: `id`, `return_number`, `order_id`, `customer_id`, `return_type`, `status`, `refund_total`, `notes`
- `return_items`: `id`, `return_id`, `order_item_id`, `product_id`, `sku`, `product_name`, `quantity`, `reason`, `condition`, `refund_amount`
- `inventory_items`
- `inventory_transactions`
- `payments`
- `gift_cards`
- `audit_logs`

Corrections applied to the unexecuted migration:

- Reset `v_restock` to null inside each return-item loop to prevent restock payload reuse between items.
- Added stricter `not found` checks.
- Replaced raw exception messages with generic safe messages.

### Shipping Schema Compatibility

Referenced tables and columns exist in current SQL sources:

- `shipments`: `id`, `shipment_number`, `order_id`, `shipping_origin_id`, `shipment_status`, `fulfillment_type`, `carrier`, `service_level`, `tracking_number`, `tracking_url`, `shipping_cost`, `package_count`, `notes`
- `shipment_items`: `shipment_id`, `order_item_id`, `quantity`
- `shipment_addresses`: `shipment_id`, `address_role`, `first_name`, `last_name`, `company`, `address1`, `address2`, `city`, `state`, `postal_code`, `country`, `phone`, `email`
- `shipment_packages`: `shipment_id`, `package_number`, `length_in`, `width_in`, `height_in`, `weight_lb`, `package_type`, `label_url`
- `shipment_events`: `shipment_id`, `event_type`, `status`, `location`, `description`, `event_time`
- `shipping_origins`: `id`, `contact_first_name`, `contact_last_name`, `company_name`, `address1`, `address2`, `city`, `state`, `postal_code`, `country`, `phone`, `email`, `active`
- `orders`
- `order_items`
- `audit_logs`

Compatibility note:

- Static migration source has `shipments_package_count_check check (package_count >= 1)`.
- The current sequential TypeScript path sets local-pickup `package_count` to `0`.
- The prepared RPC uses `1` for local pickup to satisfy the static schema. Verify the live development schema and local-pickup behavior before activation.

Corrections applied to the unexecuted migration:

- Added safer `not found` checks for order, origin, and order item lookups.
- Kept shipment quantity checks separate from row locks to avoid aggregate-plus-lock problems.
- Replaced raw exception messages with generic safe messages.

## RPC Security Audit

Confirmed in the prepared migration:

- `SECURITY DEFINER` is used.
- Each function sets `search_path = public, pg_temp`.
- Table references are schema-qualified.
- No dynamic SQL was found.
- Execute is revoked from `public`, `anon`, and `authenticated`.
- Execute is granted only to `service_role`.

Browser clients should not be able to call these RPCs directly after the migration is applied as written.

## Migration Execution Status

Status:

- Not executed.

Reason:

- Backup/checkpoint could not be confirmed from local project context.

Manual file to execute after backup confirmation:

- `supabase/migrations/phase-f4-transactional-hardening.sql`

Expected manual verification after execution:

- `transaction_idempotency_keys` exists.
- `complete_pos_sale_transaction(...)` exists.
- `complete_return_transaction(...)` exists.
- `finalize_shipment_transaction(...)` exists.
- Function execute grants are restricted to `service_role`.

## RPC Function Verification

Not performed.

Reason:

- Migration was not executed, so functions do not yet exist in the development database from this phase.

## POS Integration

Not switched.

Reason:

- The migration was not executed and RPC functions were not verified.

Current live behavior remains:

- `completePosSale()` uses the existing server-side sequential implementation.

## Return Integration

Not switched.

Reason:

- The migration was not executed and RPC functions were not verified.

Current live behavior remains:

- `completeReturn()` uses the existing server-side sequential implementation.

## Shipping Integration

Not switched.

Reason:

- The migration was not executed and RPC functions were not verified.

Current live behavior remains:

- `createShipment()` uses the existing server-side sequential implementation.

## Test Results

Atomicity tests:

- Not run. Blocked by missing backup/checkpoint and unexecuted migration.

Rollback tests:

- Not run.

Idempotency tests:

- Not run.

Permission tests:

- Not run against RPCs.
- Existing Server Actions still perform staff permission checks before sequential writes.

Audit verification:

- Not run against RPCs.

## Legacy Path Removal

No legacy sequential paths were removed.

Reason:

- The RPC migration has not been executed or verified. Removing the sequential paths now would break live development workflows.

## Remaining Browser Writes

Phase F.2/F.3 removed active browser-side writes from POS, Returns, Shipping, and Shipping Origins mutation modules.

Known remaining item from earlier audits:

- legacy browser-capable `lib/storage/mediaStorage.ts` remains in source until fully retired.

## Phase E Readiness

Recommendation:

- NOT READY.

Blockers:

- Phase F.4A migration not executed.
- RPC functions not verified.
- Server Actions not switched to RPCs.
- Atomicity, rollback, idempotency, and audit tests not run.
- Backup/checkpoint is not confirmed.
- Legacy media helper still requires final review.

## Next Manual Step

Create or confirm a safe development Supabase backup/export checkpoint for project:

- `ovdjxjekoiaeyurqblfc`

Then manually execute:

- `supabase/migrations/phase-f4-transactional-hardening.sql`

After successful execution, provide confirmation so the Server Action RPC adapters and integration can proceed.
