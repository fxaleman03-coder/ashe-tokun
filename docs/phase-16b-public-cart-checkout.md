# Phase 16B Public Cart and Checkout Foundation

## Architecture Summary

Phase 16B introduces a public storefront order flow without changing POS transaction behavior, inventory quantities, Supabase schema, or production payment status rules.

The storefront now supports:

- Public cart state
- `/cart`
- `/checkout`
- `/order-confirmation/[orderNumber]`
- Product-card and product-detail Add to Cart actions
- Pending online order creation through a server-side Supabase service-role boundary
- Admin Orders visibility through the existing `Website` sales channel

## Cart Persistence Strategy

The cart uses `localStorage` with key `ashe-tokun-public-cart-v1`.

Only non-sensitive data is persisted:

- `productId`
- `quantity`

Customer names, email, phone, billing address, shipping address, and order notes are never stored in `localStorage`.

## Public Order Creation

Online checkout uses `createPublicCheckoutOrder()` in `lib/data/publicCheckoutMutations.ts`.

The server action:

- Revalidates every submitted product ID against the live Supabase catalog
- Requires products to be active, published, and available online
- Recalculates current product prices server-side
- Checks aggregate available inventory before accepting the request
- Creates a registered customer record
- Creates billing and shipping address records
- Creates a `Website` order
- Creates order item snapshots
- Creates a pending payment placeholder
- Writes a public order audit event when available
- Revalidates Admin Orders and the confirmation route

The flow does not call `complete_pos_sale_transaction(...)`.

## Public Order Idempotency Strategy

The browser generates one checkout idempotency key per checkout attempt and stores it in `sessionStorage` until the server returns success.

The server stores the key in `orders.notes` using:

`Public checkout idempotency: <key>`

If the same key is submitted again, the existing online order is returned instead of creating a new order.

The server also generates a separate confirmation token and stores it in `orders.notes` using:

`Public checkout confirmation: <token>`

The public confirmation route requires both the order number and this token. A bare order-number URL does not expose customer details, item lines, or totals.

This prevents duplicate creation from refresh/resubmission in normal browser use. A future migration should add a dedicated unique public checkout idempotency table or expand `transaction_idempotency_keys` with a `public_checkout` workflow for strict database-level concurrency protection.

## Inventory Strategy Recommendation

Phase 16B uses approach B:

Deduct inventory only after payment confirmation.

Reason:

- Square payment integration is not active in this phase
- The order remains unpaid with `payment_status = pending`
- Stock should not be decremented for an unpaid order request
- POS inventory behavior remains untouched

Future Square integration should choose between payment-time inventory reservation or post-payment inventory commitment using a transaction-safe RPC.

## Shipping and Tax

This phase does not invent shipping rates or tax rules.

Online order requests display payment, shipping, and final processing language honestly. Stored order totals use the current product subtotal with `tax_total = 0`, `discount_total = 0`, and no separate shipping column because the current `orders` schema does not include shipping totals.

Before live paid checkout, the application needs a reviewed shipping/tax model and schema support for shipping charges if those must be stored separately.

## Admin Integration

Public orders are written with:

- `sales_channel = Website`
- `order_status = held`
- `payment_status = pending`

Existing Admin Orders repository and UI already include Website/online order metrics and detail pages. No POS receipt is created for online pending orders.

## Files Created

- `app/cart/page.tsx`
- `app/checkout/page.tsx`
- `app/order-confirmation/[orderNumber]/page.tsx`
- `components/storefront/CartProvider.tsx`
- `components/storefront/StorefrontProviders.tsx`
- `components/storefront/CartPageContent.tsx`
- `components/storefront/CheckoutPageContent.tsx`
- `components/storefront/OrderConfirmationPageContent.tsx`
- `lib/data/publicCheckoutMutations.ts`
- `lib/data/publicCheckoutRepository.ts`
- `lib/types/publicCheckout.ts`

## Files Modified

- `app/page.tsx`
- `app/shop/page.tsx`
- `app/shop/[slug]/page.tsx`
- `app/shop/category/[slug]/page.tsx`
- `components/Navbar.tsx`
- `components/shop/ProductCard.tsx`
- `components/shop/ProductDetailPage.tsx`
- `components/shop/CategoryProductGrid.tsx`
- `components/shop/FeaturedProductsPreviewClient.tsx`
- `lib/translations/index.ts`
- `lib/translations/en.ts`
- `lib/translations/es.ts`
- `lib/translations/yo.ts`

## Blocked Before Square

- No live payment collection
- No payment-success confirmation email
- No inventory reservation or deduction for unpaid web orders
- No strict database-level public checkout idempotency constraint
- No reviewed shipping-rate model
- No reviewed destination-tax model
- No dedicated online receipt generation
