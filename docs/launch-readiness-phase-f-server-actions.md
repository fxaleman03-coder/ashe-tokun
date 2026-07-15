# Launch Readiness Phase F: Server-Side Mutation Migration

Date: July 14, 2026

Scope: Begin moving browser-side Supabase writes behind authenticated Server Actions and server-side repository/service boundaries.

No SQL was executed. No migrations were applied. No schema or Supabase data was modified.

## Mutation Inventory

| Module | Current Client Before Phase F | Target Boundary | Repository/Action Used | Permission | Risk |
| --- | --- | --- | --- | --- | --- |
| Products | Browser anon via `lib/data/productMutations.ts` | Server Action + service-role client | `updateProduct`, `createProduct` | `products.edit`, `products.create` | Critical |
| Product media links | Browser anon via `lib/data/productMediaMutations.ts` | Server Action + service-role client | `setPrimaryProductMedia`, gallery relationship helpers | `products.edit` | High |
| Media upload metadata | Browser anon via `lib/storage/mediaStorage.ts` | Server Action + service-role client | `uploadProductImage` in `mediaStorageActions.ts` | `products.edit` | High |
| Inventory adjustments | Browser anon via `lib/data/inventoryMutations.ts` | Server Action + service-role client | `adjustInventory`, `receiveInventory`, `transferInventory`, `setReorderLevel` | `inventory.adjust`, `inventory.transfer` | Critical |
| Orders | Browser anon via `lib/data/orderMutations.ts` before Phase F.1 | Server Action + service-role client | `updateOrderStatus`, `updatePaymentStatus`, `addOrderNote`, `holdOrder`, `completeHeldOrder`, `cancelOrder` | `orders.edit`, `orders.cancel` | Critical |
| Customers | Browser anon via `lib/data/customerMutations.ts` before Phase F.1 | Server Action + service-role client | customer create/update/archive/restore/note/address helpers | `customers.create`, `customers.edit` | Critical |
| POS | Browser anon via `lib/data/posMutations.ts` before Phase F.3 | Server Action + service-role client; future RPC recommended for atomicity | `completePosSale` | `pos.checkout` | Critical |
| Returns | Browser anon via `lib/data/returnMutations.ts` before Phase F.2 | Server Action + service-role client; future RPC recommended for atomic completion | return create/approve/receive/complete/cancel/note helpers | `returns.create`, `returns.approve`, `returns.complete` | Critical |
| Shipping | Browser anon via `lib/data/shippingMutations.ts`, `shippingOriginMutations.ts` before Phase F.2 | Server Action + service-role client; future RPC recommended for atomic shipment creation | shipment and shipping origin helpers | `shipping.create`, `shipping.edit`, `shipping.origins.manage` | Critical |

## Migrated Modules

Phase F migrated the first priority group:

- Products
- Product media relationship writes
- Media upload metadata and Storage upload call
- Inventory item adjustments, receiving, transfers, and reorder-level updates
- Orders management mutations
- Customer management mutations
- Returns, Shipping, and Shipping Origins mutation workflows
- POS complete-sale transaction workflow

The client components still call the same exported functions, but those functions now run as Server Actions and create the Supabase service client on the server. Client components no longer execute those migrated privileged Supabase writes directly.

## Server Action Guard

Created:

- `lib/staff/serverActionAuth.ts`

The guard:

- validates the current staff session using the existing read-only staff session service
- blocks expired/missing sessions
- blocks users who must change a temporary PIN
- resolves effective permissions from role templates plus explicit overrides
- returns structured errors instead of redirects or raw Supabase failures

## Product Migration Details

Updated:

- `lib/data/productMutations.ts`

Server-side behavior:

- `createProduct()` requires `products.create`
- `updateProduct()` requires `products.edit`
- Supabase writes use `createSupabaseServiceClient()`
- duplicate checks, lookup resolution, slug generation, status mapping, and price verification remain unchanged
- local fallback returns the same result shape, but server actions cannot write browser `localStorage`

Remaining product work:

- delete, duplicate, publish-only, and archive-only flows should be added as explicit server actions if/when the UI exposes them separately

## Media Migration Details

Updated:

- `components/admin/MediaLibrary.tsx`
- `lib/storage/mediaStorageActions.ts`
- `lib/data/productMediaMutations.ts`

Server-side behavior:

- `uploadProductImage()` receives `FormData`, validates image type/size, uploads to Storage, inserts `media_assets`, and rolls back the Storage object if the database insert fails
- product-media relationship helpers require `products.edit`
- primary image assignment and gallery relationship writes use the service-role client on the server
- browser code still detects image dimensions before submission and sends them with the upload form data

Remaining media work:

- rename/delete metadata flows should be implemented as explicit server actions when those UI controls are introduced
- the older browser-capable `lib/storage/mediaStorage.ts` should be retired after all references are removed

## Inventory Migration Details

Updated:

- `lib/data/inventoryMutations.ts`

Server-side behavior:

- `createInventoryItem()`, `adjustInventory()`, `receiveInventory()`, and `setReorderLevel()` require `inventory.adjust`
- `transferInventory()` requires `inventory.transfer`
- Supabase writes use the service-role client on the server
- existing validation, balance checks, ledger insertion, and critical partial-failure messaging remain unchanged

Remaining inventory work:

- move any future reservation mutations behind server actions
- replace multi-step inventory updates with database transactions/RPCs before live high-volume use

## Remaining Browser Mutations

Still pending migration:

- no remaining Returns, Shipping, or POS browser-side mutation modules
- legacy browser-capable `lib/storage/mediaStorage.ts` remains in source until fully retired

POS no longer performs browser-side Supabase writes, but the sale workflow still touches orders, order items, payments, receipts, inventory quantities, and inventory ledger rows across multiple statements. A transaction-safe RPC/database function is still recommended before live high-volume use.

## Migration Order

Recommended next order:

1. Products complete-out: archive/publish/duplicate/delete actions if exposed.
2. Media complete-out: metadata rename/delete plus product gallery mutations.
3. Inventory transaction/RPC hardening.
4. Returns transaction/RPC hardening.
5. Shipping transaction/RPC hardening.
6. POS transactional RPC hardening.

Products, media, and inventory were prioritized first because they directly block applying the Phase E catalog/media/inventory RLS hardening and have narrower write surfaces than POS.

## Error Handling

Migrated actions return structured results matching the existing UI expectations:

- success result
- local fallback result where applicable
- friendly error string
- no service key, session token, or internal stack trace

Some Supabase error messages are still returned in the existing result shape. Before production launch, these should be mapped to friendlier categories where they reach public/admin UI.

## Readiness for Phase E RLS Execution

Partially ready.

Safe to harden after this phase:

- Product create/update paths now have server-side permission checks.
- Product media relationship writes now have server-side permission checks.
- Admin media upload writes now have server-side permission checks.
- Inventory adjustment/receiving/transfer/reorder writes now have server-side permission checks.
- Admin order management writes now have server-side permission checks.
- Admin customer management writes now have server-side permission checks.
- Admin returns writes now have server-side permission checks.
- Admin shipping writes now have server-side permission checks.
- Admin shipping origin writes now have server-side permission checks.
- Admin POS sale completion writes now have server-side permission checks.

Not yet safe to fully apply all Phase E RLS migrations:

- older media storage helper remains in source until fully retired
- multi-step operational workflows still need transaction/RPC hardening before live production use

## Remaining Risks

- Multi-step inventory writes are still not transactionally atomic.
- Local fallback product edits cannot write browser localStorage from server actions.
- Browser-side returns, shipping, and POS writes have been removed from the migrated mutation modules.
- POS sale writes are server-side, but still need an atomic database transaction/RPC before live operational use.
- Returns and shipping writes are server-side, but still need atomic database transaction/RPC hardening for multi-step completion/creation flows.
- Applying all Phase E policies still requires review for legacy media upload helpers and read-path RLS compatibility.

## Phase F.1 Orders And Customers

See `docs/launch-readiness-phase-f1-orders-customers.md`.

Phase F.1 migrated:

- order status, payment status, notes, hold/complete-held, and cancellation actions
- customer create/update/deactivate/reactivate/note actions
- customer address create/update/delete/default actions

No public storefront checkout/customer architecture was changed.

## Phase F.2 Returns, Shipping And Shipping Origins

See `docs/launch-readiness-phase-f2-returns-shipping.md`.

Phase F.2 migrated:

- return create/approve/receive/complete/cancel/note workflows
- shipment create/status/package/tracking/event/cancel/delivery/pickup workflows
- shipping origin create/update/activate/deactivate/default workflows

The return, refund, inventory restoration, shipment, tracking, pickup, origin validation, order, and customer business rules were preserved.

## Phase F.3 POS Transaction Hardening

See `docs/launch-readiness-phase-f3-pos.md`.

Phase F.3 migrated:

- POS complete-sale writes from browser-side anon Supabase access to an authenticated Server Action
- order, order item, payment, receipt, inventory update, and inventory transaction writes through the server-side service client
- POS path revalidation after successful sale completion

The POS UI, cart calculations, tax handling, discount handling, receipt numbering, order numbering, and inventory deduction behavior were preserved.

## Phase F.4 Transactional Database Hardening

See `docs/launch-readiness-phase-f4-transactional-hardening.md`.

Phase F.4 prepared but did not execute:

- `supabase/migrations/phase-f4-transactional-hardening.sql`
- `complete_pos_sale_transaction(...)`
- `complete_return_transaction(...)`
- `finalize_shipment_transaction(...)`

The prepared migration adds a shared idempotency table and transaction-safe RPC drafts for POS sale completion, return completion/restock, and shipment creation. These RPCs are not active until the migration is manually applied and the Server Actions are intentionally switched to call them.

Do not claim the workflows are transaction-safe yet. Current live code remains the existing server-side sequential implementation.

## Phase F.4A RPC Activation Checkpoint

See `docs/launch-readiness-phase-f4a-rpc-activation.md`.

Phase F.4A audited the prepared migration for schema compatibility and RPC security, corrected the unexecuted migration, and stopped before SQL execution because no safe development Supabase backup/export checkpoint was confirmed. Server Actions were not switched to RPCs.

## Verification

Required:

- `npm run lint`
- `npm run build`

No SQL execution is part of this phase.
