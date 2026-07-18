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

## Phase 15F Automatic Receipt Printing

After the live sale succeeded, POS receipt handling was upgraded so the
completed receipt appears immediately after the RPC returns a verified sale
result.

Automatic receipt workflow:

- `completePosSale()` still calls `complete_pos_sale_transaction(...)` exactly
  once per sale attempt.
- The receipt modal uses only the completed RPC result plus the already-rendered
  cart, customer, cashier, and payment state.
- No print action calls the RPC.
- No print action creates an order, payment, receipt, inventory movement, or
  idempotency record.
- Receipt data remains visible until the operator chooses New Sale or closes the
  receipt workflow.

Print layout:

- Dedicated receipt root: `#pos-receipt-print-root`.
- Print CSS hides the Admin shell/catalog while a POS receipt is present.
- Receipt print content is black text on white background.
- A named `@page pos-receipt` target prepares an 80 mm thermal receipt layout.
- Letter/A4 browser printing remains usable because the receipt content is
  constrained to a compact receipt width.
- Receipt controls use `.pos-receipt-no-print` and are hidden from printed
  output.

Duplicate-print prevention:

- The automatic print effect stores the last printed receipt number in a React
  ref.
- A re-render cannot automatically open the print dialog twice for the same
  receipt.
- The manual Print Receipt button remains available and may intentionally reopen
  the print dialog.

Browser fallback behavior:

- If a mobile or desktop browser blocks automatic printing, the completed
  receipt remains visible.
- The operator can tap Print Receipt manually.
- Canceling the print dialog does not affect the completed sale.

Stale message cleanup:

- Removed the obsolete POS message about development Supabase writes and future
  production RPC activation.
- Current message: Sales are processed securely through the transactional POS
  service.

Phase 15F files modified:

- `components/admin/AdminPOS.tsx`
- `app/globals.css`
- `lib/translations/index.ts`
- `lib/translations/en.ts`
- `lib/translations/es.ts`
- `lib/translations/yo.ts`
- `docs/phase-15d-live-pos-activation.md`

Phase 15F validation:

- `npm run lint`: PASS.
- `npm run build`: PASS.

Phase 15F deployment:

- Pending at the time this section was authored.

## Final Phase 15 Status

Ready to retry the first manual UI-driven production sale after Phase 15D.2
deployment.

Final sale verification remains pending until the user completes the controlled sale.
