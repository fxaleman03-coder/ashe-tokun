# Phase 15D: Live POS Activation

Date: July 18, 2026
Project: ASHE TOKUN

## Executive Summary

POS Complete Sale containment was removed after Phase 15A, 15B, 15B.5, 15C, and 15D.1 verification passed.

The POS completion path remains RPC-only through `complete_pos_sale_transaction(...)`. The unsafe sequential fallback remains absent.

No production sale was created automatically during activation.

## Containment Removed

Removed only the intentional POS sale-completion containment:

- `launchContainment.posSaleCompletion` changed from `true` to `false`.
- The temporary POS sale unavailable notice now renders only when POS sale containment is enabled.

Preserved containment:

- `inventoryWrites`
- `shipmentCreation`
- `returnCompletion`
- `completedOrderCancellation`

## Files Modified

- `lib/launchContainment.ts`
- `components/admin/AdminPOS.tsx`
- `docs/phase-15d-live-pos-activation.md`

## Protections Preserved

Preserved:

- Staff authentication
- Staff permission check through `pos.checkout`
- Cart validation
- Product active/status/store-availability validation
- Selected-location inventory validation
- Payment method validation
- Tendered amount validation
- Button loading state
- Duplicate-click prevention through `isCompleting`
- Server-generated idempotency key
- Safe RPC error handling
- Receipt/result handling

## RPC-Only Completion Path

Verified in source:

- `completePosSale()` calls `complete_pos_sale_transaction(...)`.
- `createPosSaleRequestKey()` sends a server-generated `pos-sale-${randomUUID()}` idempotency key.
- No sequential production fallback exists.
- No direct production writes remain in `completePosSale()` for:
  - `orders`
  - `order_items`
  - `payments`
  - `receipts`
  - `inventory_items`
  - `inventory_transactions`

## Local Validation

Results:

- `npm run lint`: PASS
- `npm run build`: PASS

## Deployment

Deployment status:

- PASS

Recorded SHAs:

- Local commit SHA: `c4dba12650fb9d76c0503507913564fc839ab444`
- GitHub production branch SHA: `c4dba12650fb9d76c0503507913564fc839ab444`
- Vercel production deployment SHA: `c4dba12`
- Vercel deployment ID: `dpl_2i5X1g6ufepQMrFZpxEbUQkSYPgC`
- Vercel deployment URL: `https://ashe-tokun-918t2bluk-fxaleman03-coders-projects.vercel.app`

Vercel build logs confirmed:

```text
Cloning github.com/fxaleman03-coder/ashe-tokun (Branch: main, Commit: c4dba12)
```

## Production URL Verification

Production URL:

- `https://ashetokun.com`

Status:

- PASS
- `https://ashetokun.com/admin/pos` returned `307` to `/staff/login?status=session_required` for an unauthenticated request.
- Response was served by Vercel.
- Authentication protection remains active.

## First Live Sale Protocol

The user will manually perform one controlled sale from production POS after deployment.

Recommended sale:

- Customer: Walk-in customer
- Quantity: 1
- Product: low-value product with verified positive inventory at selected location
- Payment method: Cash
- Tendered amount: exact cash
- Discount: none unless necessary
- Tax override: none

## Post-Sale Verification Checklist

Immediately after the manual sale, verify remotely:

- Exactly one order created.
- Correct order number.
- Correct order total.
- Exactly one expected order item.
- Payment recorded correctly.
- Inventory decreased by exactly one.
- Inventory transaction created.
- Receipt/result generated.
- Audit event created if supported.
- Idempotency record created.
- No duplicate order.
- No orphan records.
- No unexpected database writes.

## Sale Verification Results

First manual UI-driven production sale attempt failed safely.

Exact production error from Vercel runtime logs:

```text
[ASHE TOKUN POS] RPC sale completion failed. {
  errorCode: '22P02',
  errorMessage: 'invalid input syntax for type uuid: "local-walk-in-customer"',
  errorDetails: null,
  errorHint: null
}
```

Observed request path:

- `POST /admin/pos`
- Server Action: `completePosSale(...)`
- RPC: `complete_pos_sale_transaction(...)`

Root cause:

- The POS page used the local fallback walk-in customer sentinel
  `local-walk-in-customer`.
- Production has a real active walk-in customer:
  `CUST-WALK-IN`.
- The customer repository read path used anon Supabase reads, which returned no
  rows under production RLS.
- The local sentinel was sent into the RPC parameter `p_customer_id uuid`.
- Postgres rejected the value before sale creation, so the transaction did not
  complete and inventory was not decremented.

Security architecture before fix:

- RPC invocation was already server-side through a Server Action.
- `completePosSale()` already used the server-only service-role Supabase
  client.
- The service-role key was not exposed to the browser.
- The failure was not caused by a browser-side RPC call.

Security architecture after fix:

- Customer repository reads now use the server/service repository boundary on
  protected admin pages.
- POS receives the real Supabase walk-in customer UUID when available.
- `completePosSale()` defensively converts any `local-*` customer sentinel to
  `null` before calling the UUID-typed RPC.
- RPC completion remains service-role, server-side, and atomic.
- No sequential fallback was introduced.

Files modified for Phase 15D.2:

- `lib/data/customersRepository.ts`
- `lib/data/posMutations.ts`
- `docs/phase-15d-live-pos-activation.md`

Validation:

- `npm run lint`: PASS.
- `npm run build`: PASS.
- Non-destructive production log inspection: PASS.
- No additional production sale was executed by Codex.

Retry procedure:

1. Open production Admin POS.
2. Confirm customer is Walk-in Customer.
3. Select Store.
4. Add the one stocked product prepared for controlled sale.
5. Use Cash with exact tendered amount.
6. Complete one sale only.
7. Verify order, payment, receipt, inventory decrement, inventory movement, and
   idempotency record.

## Final Phase 15 Status

Ready to retry the first manual UI-driven production sale after Phase 15D.2
deployment.

Final sale verification remains pending until the user completes the controlled sale.
