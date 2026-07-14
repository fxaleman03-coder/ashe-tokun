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
| Orders | Browser anon via `lib/data/orderMutations.ts` | Future Server Actions | Existing client mutation module | `orders.edit`, `orders.cancel` | Critical |
| Customers | Browser anon via `lib/data/customerMutations.ts` | Future Server Actions | Existing client mutation module | `customers.create`, `customers.edit` | Critical |
| POS | Browser anon via `lib/data/posMutations.ts` | Future transactional Server Action/RPC | Existing client mutation module | `pos.access` plus inventory/order/payment permissions | Critical |
| Returns | Browser anon via `lib/data/returnMutations.ts` | Future Server Actions | Existing client mutation module | `returns.create`, `returns.approve`, `returns.complete` | Critical |
| Shipping | Browser anon via `lib/data/shippingMutations.ts`, `shippingOriginMutations.ts` | Future Server Actions | Existing client mutation modules | `shipping.create`, `shipping.edit`, `shipping.origins.manage` | Critical |

## Migrated Modules

Phase F migrated the first priority group:

- Products
- Product media relationship writes
- Media upload metadata and Storage upload call
- Inventory item adjustments, receiving, transfers, and reorder-level updates

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

- `lib/data/orderMutations.ts`
- `lib/data/customerMutations.ts`
- `lib/data/posMutations.ts`
- `lib/data/returnMutations.ts`
- `lib/data/shippingMutations.ts`
- `lib/data/shippingOriginMutations.ts`

POS should remain a later phase because it touches orders, order items, payments, receipts, inventory quantities, and inventory ledger rows. It needs an atomic transaction/RPC design rather than a direct lift-and-shift.

## Migration Order

Recommended next order:

1. Products complete-out: archive/publish/duplicate/delete actions if exposed.
2. Media complete-out: metadata rename/delete plus product gallery mutations.
3. Inventory transaction/RPC hardening.
4. Customers.
5. Orders.
6. Returns.
7. Shipping.
8. POS transactional sale flow.

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

Not yet safe to fully apply all Phase E RLS migrations:

- customer, order, POS, returns, and shipping browser-side mutations still depend on development anon policies
- older media storage helper remains in source until fully retired

## Remaining Risks

- Multi-step inventory writes are still not transactionally atomic.
- Local fallback product edits cannot write browser localStorage from server actions.
- Browser-side POS, orders, customer, returns, and shipping writes remain production blockers.
- Applying all Phase E policies now would break remaining browser-side operational modules.

## Verification

Required:

- `npm run lint`
- `npm run build`

No SQL execution is part of this phase.
