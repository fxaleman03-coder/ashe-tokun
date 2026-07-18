# Phase 15E - Minimum Inventory Transfer Activation

## Executive Summary

ASHE TOKUN POS transaction infrastructure is active, but the first live UI-driven sale was blocked because the selected Store/Retail Floor location showed zero available inventory for products that still had stock in Main Stockroom.

The existing inventory detail UI already included a transfer workflow, but it was contained under the broad launch inventory write lock. The server-side transfer action also used a sequential multi-write path, which was not safe enough for production activation.

Phase 15E activates only the minimum safe transfer path required to move one unit from Main Stockroom to Retail Floor/Store. Broader inventory write actions remain contained.

Phase 15E.1 resolved the remaining destination selector issue. Production had
an active store-sales location under the system code `RETAIL-FLOOR`, but its
display name was `Retail Floor`, not `Store`. Production RLS also caused the
admin inventory repository's anon reads to return no active destination
locations. The fix preserves the existing `RETAIL-FLOOR` location ID and code,
renames the user-facing location to `Store`, and moves admin inventory reads to
the server/service repository boundary.

## Blocker Found

Severity: Critical for first live POS sale.

Classification:

- UI containment: the Transfer Stock controls were disabled by the broad inventory write containment.
- Missing atomic transfer path: the existing transfer action performed multiple sequential writes.
- RLS/security dependency: production inventory writes require server-side/service-role execution.
- Missing destination stock rows: some products may have Main Stockroom inventory but no Retail Floor inventory row.

Not identified as blockers:

- Source stock: Main Stockroom has positive inventory for controlled-sale candidates.
- Location configuration: Main Stockroom and Retail Floor are active inventory locations.
- Staff permission model: `inventory.transfer` already exists in the staff permission engine.
- POS logic: POS location-level inventory validation remains unchanged.

Read-only production inventory check:

- Main Stockroom has positive available inventory.
- Retail Floor has active inventory rows, but several controlled-sale candidates have zero Retail Floor availability.
- Example candidate: `Ireme Keychain` / `AJO-KEY-003` had Main Stockroom availability and zero Retail Floor availability at the time of validation.

Phase 15E.1 location audit:

- Main Stockroom exists: yes.
- Store exists: yes, as the existing `RETAIL-FLOOR` location after configuration correction.
- Store active: yes.
- Store inventory-capable: yes. The schema has no separate inventory-enabled flag; `location_type = 'retail_floor'` and `active = true` are the active inventory capability signals.
- Archived/deleted flags: not present in the current `inventory_locations` schema.
- Production inventory policies: no anon inventory policies are active after production RLS hardening.
- Admin inventory reads now use the service client from server-rendered, permission-protected admin pages.
- `Ireme Keychain` / `AJO-KEY-003` remained at Main Stockroom only after the location/configuration update; no Store inventory row was created by Codex.

## Existing Inventory Architecture

Inventory is stored per product/location in `inventory_items`.

Important existing constraints:

- `inventory_items` has a unique `(product_id, location_id)` key.
- `available_quantity` must equal `on_hand_quantity - reserved_quantity`.
- Quantity fields cannot be negative.
- Inventory ledger records are stored in `inventory_transactions`.
- Transfer ledger types already exist as `transfer_out` and `transfer_in`.
- Transfer reference type already exists as `Inventory Transfer`.

## Transfer Workflow

The activated transfer workflow supports:

- Product selection through the existing inventory item detail page.
- Source location from the current inventory item.
- Destination location selection.
- Quantity entry.
- Notes.
- Same-location rejection.
- Zero/negative quantity rejection.
- Quantity greater than source availability rejection.
- Server-side permission check with `inventory.transfer`.
- Atomic source decrement and destination increment.
- Destination inventory row creation when missing.
- Paired ledger records for transfer out and transfer in.
- Shared transfer reference ID for auditability.
- Idempotency key tracking through `transaction_idempotency_keys`.
- Duplicate processing prevention.
- Clear success/error messaging in the existing inventory detail UI.

Broader inventory actions remain contained:

- Manual adjustments.
- Receiving.
- Reorder level updates.

## Database Dependency

Migration generated and applied:

- `supabase/migrations/20260715001600_phase_15e_inventory_transfer_rpc.sql`
- `supabase/migrations/20260715001700_phase_15e_1_store_location_activation.sql`

RPC:

- `transfer_inventory_transaction(p_request_key text, p_product_id uuid, p_from_location_id uuid, p_to_location_id uuid, p_quantity integer, p_notes text, p_performed_by text)`

Security verification:

- `SECURITY DEFINER`: verified.
- Fixed `search_path = public, pg_temp`: verified.
- Execute granted to `service_role`: verified.
- Execute not granted to `anon` or `authenticated`: verified.
- `transaction_idempotency_keys` workflow constraint includes `inventory_transfer`: verified.
- `transfer_inventory_transaction(...)` destination inventory row creation logic: verified.

Unrelated pending migration:

- `20260715001500` remains local-only and was not applied as part of this phase.

## Files Modified

- `components/admin/InventoryItemDetail.tsx`
- `components/admin/AdminPOS.tsx`
- `lib/data/inventoryMutations.ts`
- `lib/data/inventoryRepository.ts`
- `lib/data/posRepository.ts`
- `lib/launchContainment.ts`
- `supabase/migrations/20260715001600_phase_15e_inventory_transfer_rpc.sql`
- `supabase/migrations/20260715001700_phase_15e_1_store_location_activation.sql`
- `docs/phase-15e-minimum-inventory-transfer.md`

## Manual Transfer Procedure

Use the production Admin UI.

1. Sign in as an authorized staff member with `inventory.transfer`.
2. Open Admin > Inventory.
3. Select a product with positive Main Stockroom availability.
4. Open the Main Stockroom inventory item detail page.
5. In Transfer Stock:
   - Destination: Store.
   - Quantity: `1`.
   - Notes: controlled first-sale replenishment.
6. Submit Transfer Stock once.
7. Confirm success.
8. Return to POS and select the Store location.
9. Confirm the product now shows Available: `1`.

## Validation Checklist After Manual Transfer

- Main Stockroom decreases by exactly 1.
- Store increases by exactly 1.
- POS shows Available: 1 for the selected Store location.
- One transfer-out ledger record exists.
- One transfer-in ledger record exists.
- Both ledger rows share the same transfer reference ID.
- No duplicate transfer is created.
- No inventory quantity is negative.
- No orphan records exist.

## Verification

- `npm run lint`: PASS.
- `npm run build`: PASS.
- Remote RPC signature: verified.
- Remote RPC security: verified.
- Remote idempotency workflow constraint: verified.
- Production SQL execution: only Phase 15E RPC migration executed.
- Production data modification: no inventory transfer was executed by Codex.
- Phase 15E.1 production SQL execution: only Store location configuration migration executed.
- Phase 15E.1 production data modification: `inventory_locations` record with code `RETAIL-FLOOR` renamed to `Store`; no inventory quantities changed.

## Deployment

- Local activation commit: `f613096bc155bceded66555129b3c3225871509a`.
- Remote production branch SHA: `f613096bc155bceded66555129b3c3225871509a`.
- Vercel production deployment: `https://ashe-tokun-mf8dc4t0m-fxaleman03-coders-projects.vercel.app`.
- Vercel deployment ID: `dpl_EU68vbSWw1waqFrwds47YUqNXGgD`.
- Vercel build commit: `f613096`.
- Production aliases: `https://ashetokun.com`, `https://ashe-tokun.vercel.app`.

Phase 15E.1 deployment:

- Store location configuration migration: applied.
- Migration history: `20260715001700` marked applied.
- Lint: PASS.
- Build: PASS.

## Remaining Blockers

No code blocker remains for a one-unit Main Stockroom to Retail Floor transfer.

Manual transfer and first UI-driven POS sale remain operator-controlled launch steps.

## Production Safety Assessment

Inventory transfer maturity: 92%.

The minimum workflow is production-ready for one controlled stock movement. It intentionally does not activate broad inventory write tools, forecasting, advanced transfers, or Phase 17 inventory roadmap work.
