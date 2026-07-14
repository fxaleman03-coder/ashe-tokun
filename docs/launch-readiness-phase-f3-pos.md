# Launch Readiness Phase F.3: POS Transaction Hardening

Date: July 14, 2026

Scope: Move the current Admin POS complete-sale workflow behind an authenticated Server Action while preserving the existing POS UI, calculations, receipts, inventory behavior, order behavior, and customer behavior.

No SQL was executed. No migrations were created or applied. No schema or Supabase data was modified.

## Executive Summary

Phase F.3 migrated the active POS sale mutation from browser-side anon Supabase writes to a server-side action that uses the Supabase service-role client only after staff authentication and `pos.checkout` permission validation.

The existing POS UI call site was preserved:

- `components/admin/AdminPOS.tsx`

The component still calls `completePosSale(input)`, but that function now runs on the server.

## POS Write Flow Inventory

Current supported POS write found:

- `completePosSale(input)`

Tables written during a Supabase-backed sale:

- `orders`
- `order_items`
- `payments`
- `receipts`
- `inventory_items`
- `inventory_transactions`

Tables read during validation and numbering:

- `tax_rates`
- `products`
- `inventory_items`
- `inventory_locations`
- `orders`
- `receipts`

No separate POS browser mutation was found for returns, exchanges, receipt reprints, customer creation, or payment capture.

## Mutation Migrated

Updated:

- `lib/data/posMutations.ts`

Changes:

- Converted the module from `"use client"` to `"use server"`.
- Replaced the shared anon Supabase client with `createSupabaseServiceClient()`.
- Added `requireServerActionPermission("pos.checkout")`.
- Preserved local fallback behavior when `USE_SUPABASE` is false.
- Preserved product validation, stock validation, tax calculation, discount allocation, tendered amount, change due, order numbering, receipt numbering, and inventory deduction behavior.
- Added targeted revalidation for:
  - `/admin`
  - `/admin/pos`
  - `/admin/orders`
  - `/admin/orders/[id]`

## Permission Mapping

| Mutation | Permission |
| --- | --- |
| `completePosSale` | `pos.checkout` |

The POS route/sidebar access boundary remains `pos.access`. Completing a sale requires the stronger checkout permission.

## Client Cleanup

Removed browser-side Supabase writes from:

- `lib/data/posMutations.ts`

Client Components still import the module, but the exported sale function is now a Server Action.

## Preserved Behavior

The migration intentionally did not change:

- POS screen layout
- cart behavior
- customer selection behavior
- tax calculations
- discount calculations
- payment method handling
- tendered/change due handling
- order totals
- order numbering
- receipt numbering
- receipt creation behavior
- inventory quantity deduction rules
- inventory transaction ledger shape

## Error Handling

The Server Action returns the existing `PosSaleResult` shape:

- successful Supabase result
- local fallback result
- friendly validation errors
- critical partial-failure flag when an order was already created

Raw Supabase errors are not returned to the browser for the migrated write path.

Server logs may include safe order identifiers and friendly failure context for manual review. No keys, tokens, PINs, payment secrets, or session data are logged.

## Transaction Boundary Finding

The current POS sale still performs multiple database statements:

1. Insert order.
2. Insert order items.
3. Insert payment.
4. Insert receipt.
5. Update inventory item rows.
6. Insert inventory transaction rows.

This phase did not create a database RPC because the user explicitly requested no migration unless a transaction-safe RPC was proven necessary.

Production recommendation:

- Replace the multi-step POS sale with a transaction-safe RPC/database function before live high-volume use.
- Keep the Server Action as the authenticated boundary that validates permission and calls the RPC.

## Remaining Browser Writes

Still pending after Phase F.3:

- `lib/data/returnMutations.ts`
- `lib/data/shippingMutations.ts`
- `lib/data/shippingOriginMutations.ts`
- legacy browser-capable `lib/storage/mediaStorage.ts`

## Readiness for Phase E RLS Hardening

Improved, but not complete.

Now safer to harden:

- Admin POS sale completion writes.

Still not ready for full production RLS execution:

- Returns depend on browser-side return/refund writes.
- Shipping depends on browser-side fulfillment/origin writes.
- Legacy browser-capable media helper remains until fully retired.
- POS sale execution is server-side, but should become atomic before operational launch.

## Verification

Required:

- `npm run lint`
- `npm run build`

Manual behavior checks recommended:

- POS page loads.
- Authorized staff with `pos.checkout` can complete a sale.
- Staff without `pos.checkout` receives an access-denied result.
- Cart totals match previous behavior.
- Payment status remains `paid`.
- Order and receipt numbers keep the existing prefixes.
- Inventory deductions and ledger rows match previous behavior.
- Partial failure messaging still directs manual review when an order was already created.
