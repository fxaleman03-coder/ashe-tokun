# Phase 15A: POS Production Readiness Audit

Date: July 18, 2026
Project: ASHE TOKUN

## Historical Note

This was a pre-activation readiness audit. It documents the POS state before
RPC wiring, controlled validation, live activation, inventory activation, and
receipt-printing improvements completed in later phases.

## Executive Summary

The ASHE TOKUN Point of Sale is a mature pre-production POS interface with product lookup, customer selection, cart, discounts, taxes, payment entry, receipt preview, hold sale, cancel sale, and server-side checkout scaffolding already implemented.

It is not ready to complete production sales today because sale completion is intentionally contained and the checkout mutation still uses a sequential multi-write path instead of the prepared transaction-safe RPC. If containment were removed without RPC activation, a failure after order creation could leave partial orders, payments, receipts, or inventory updates requiring manual repair.

Final status: Not ready for live production sale completion.

## Current POS Maturity

Estimated POS maturity: 78%.

Implemented and usable for pre-sale operations:

- Product lookup
- Barcode/SKU lookup
- Location-aware availability display
- Customer panel
- Walk-in customer support
- Customer search
- Cart
- Quantity controls
- Discount entry
- Tax entry
- Payment method selection
- Cash tendered and change due
- Receipt preview
- Hold sale
- Cancel sale
- Return entry link
- Server Action boundary for checkout
- Staff permission checks for POS page access and checkout

Not production-ready:

- Atomic sale completion
- RPC integration
- Production RLS execution
- End-to-end live sale smoke test
- Confirmed nonzero inventory for sellable products at the selected POS location

## UI Status

### Product Lookup

Implemented in `components/admin/AdminPOS.tsx`.

The UI loads products from `getPosProducts()` and supports search by product name, brand, SKU, barcode, vendor SKU, and category.

### Barcode Search

Implemented through the Barcode/SKU input. Pressing Enter or clicking Add Item matches exact SKU or barcode against loaded POS products.

### Customer Panel

Implemented. The selected customer panel displays customer name/company, contact where applicable, customer number, type, order count, and lifetime value.

### Walk-In Customer

Implemented through `getWalkInCustomer()`. If no Supabase walk-in customer exists, the POS falls back to a local walk-in customer object.

### Customer Search

Implemented. Active customers are searchable by name, customer number, type, company, contact, email, or phone.

### Cart

Implemented with add, remove, increment, decrement, clear cart, subtotal, discount, tax, and total.

### Discounts

Implemented as fixed amount or percentage. Discount calculation clamps percentage to 100% and total discount to subtotal.

### Taxes

Implemented as a manually editable tax percentage. Server action can fall back to the first active `tax_rates` row if the incoming value is invalid.

### Payments

Implemented payment methods:

- Cash
- Card
- Zelle
- Other

No live payment processor is integrated. Payment rows are internal records only.

### Receipt Preview

Implemented in the POS UI using next receipt number, cart lines, subtotal, discount, tax, total, tendered amount, change due, customer, and timestamp.

### Returns

The POS links to `/admin/returns/new`. Return completion is separately contained for launch.

### Hold Sale

Implemented as a local UI-only action. It does not persist a held cart or create a database hold record.

### Cancel Sale

Implemented as a local UI-only cart reset with browser confirmation. It does not affect persisted records unless a sale was already completed.

## Transaction Flow

Current intended checkout path:

1. Staff opens `/admin/pos`.
2. Page requires `pos.access`.
3. Page loads POS products, active locations, walk-in customer, customers, next order number, next receipt number, and inventory summary.
4. Staff selects location.
5. Staff adds product by search, barcode, or SKU.
6. Cart validates location availability.
7. Staff selects customer or keeps walk-in customer.
8. Staff enters discount, tax, payment method, and tendered amount.
9. Staff clicks Complete Sale.
10. UI checks `launchContainment.posSaleCompletion`.
11. Server action `completePosSale()` checks `launchContainment.posSaleCompletion`.
12. Execution stops before any database write.

Exact current stop:

- UI stop: `components/admin/AdminPOS.tsx` checks `launchContainment.posSaleCompletion` before calling the Server Action.
- Server stop: `lib/data/posMutations.ts` checks `launchContainment.posSaleCompletion` at the beginning of `completePosSale()`.

Current containment message:

- `POS sale completion is temporarily unavailable.`

## RPC Dependency

Prepared RPC:

- `public.complete_pos_sale_transaction(...)`

Prepared migration:

- `supabase/migrations/20260715001300_phase_f4_transactional_hardening.sql`

Status:

- RPC SQL exists in the repository.
- RPC was not executed during this audit.
- Prior Phase F.4A documentation says migration execution was blocked by missing backup/checkpoint confirmation.
- `completePosSale()` does not currently call `complete_pos_sale_transaction(...)`.
- The live Server Action still contains the older sequential write implementation behind containment.

Why the RPC is required:

- POS completion writes `orders`, `order_items`, `payments`, `receipts`, `inventory_items`, `inventory_transactions`, and audit data.
- These writes must succeed or fail as one transaction.
- The prepared RPC includes row locking, idempotency, inventory checks, and audit insertion inside a database transaction boundary.

## Migration Dependency

Required unexecuted migration:

- `supabase/migrations/20260715001300_phase_f4_transactional_hardening.sql`

It creates:

- `transaction_idempotency_keys`
- `complete_pos_sale_transaction(...)`
- supporting transactional functions for returns and shipping
- execute grants restricted to `service_role`

Before execution:

- Confirm a current production/development backup.
- Confirm target Supabase project.
- Execute manually in Supabase.
- Verify functions and grants.
- Run RPC smoke tests before removing containment.

## RLS Dependency

Development policies still exist for POS-related tables:

- `supabase/policies-pos-development.sql`
- `supabase/policies-inventory-development.sql`

These include anon read/write policies for:

- `customers`
- `orders`
- `order_items`
- `payments`
- `receipts`
- `inventory_locations`
- `inventory_items`
- `inventory_transactions`

Production hardening draft:

- `supabase/migrations/20260715001400_phase_e_production_rls.sql`

This migration drops the development anon POS/inventory policies and leaves operational writes behind service-role boundaries. It should not be applied until the RPC path and Server Action integration are verified.

## Database Dependency

Required POS tables exist in static schema sources:

- `orders`
- `order_items`
- `customers`
- `payments`
- `receipts`
- `inventory_items`
- `inventory_transactions`
- `audit_logs`

Schema note:

- The current schema uses `inventory_transactions`, not `inventory_movements`.
- POS UI and mutations align to `inventory_transactions`.

Current sequential Server Action writes:

- `orders`
- `order_items`
- `payments`
- `receipts`
- `inventory_items`
- `inventory_transactions`

Prepared RPC additionally writes:

- `audit_logs`
- `transaction_idempotency_keys`

## Inventory Dependency

Products display `Available: 0` when the selected POS location has no available inventory row for that product, or when the matching row has `available_quantity <= 0`.

Current read path:

1. `/admin/pos` calls `getPosProducts()`.
2. `getPosProducts()` calls `getProducts()` and `getInventoryItems()`.
3. Inventory items are grouped by `product_id`.
4. Each POS product receives `inventoryByLocation`.
5. The UI displays availability from the selected location only.

Likely causes for `Available: 0`:

- Inventory has not been received into the selected location.
- The selected location is not the location that holds stock.
- `inventory_items.available_quantity` is actually zero.
- Product IDs between products and inventory rows do not match.
- Supabase inventory read returns no rows and local fallback products have zero stock.

This is not caused by the POS button logic. The Add to Cart button correctly disables when selected-location availability is zero.

## Contained Functionality

Current production containment:

- POS sale completion is disabled in UI and server action.
- Inventory writes are disabled separately.
- Shipping creation is disabled separately.
- Return completion is disabled separately.
- Completed/paid order cancellation is disabled separately.

Files involved in POS containment:

- `lib/launchContainment.ts`
- `components/admin/AdminPOS.tsx`
- `lib/data/posMutations.ts`
- `lib/translations/en.ts`
- `lib/translations/es.ts`
- `lib/translations/yo.ts`

## Production Blockers

### Critical Blocker 1: POS Sale Completion Containment

`launchContainment.posSaleCompletion` is `true`, so sale completion is intentionally blocked before any write.

### Critical Blocker 2: RPC Not Activated

`complete_pos_sale_transaction(...)` is prepared but not confirmed as executed in Supabase.

### Critical Blocker 3: Server Action Not Wired To RPC

`completePosSale()` does not call the prepared RPC. If containment were removed now, the action would use sequential writes.

### Critical Blocker 4: No Atomic Live Sale Test

No verified test sale exists for:

- Walk-in customer
- One product
- Cash payment
- receipt creation
- inventory decrement
- inventory ledger
- audit event
- rollback/idempotency behavior

### High Blocker 5: Inventory Availability Not Confirmed

If sellable products show `Available: 0`, a cash sale cannot proceed even after containment is removed.

### High Blocker 6: Production RLS Not Ready For Activation

Development anon policies still exist. Production RLS should be applied only after the service-role RPC path is active and verified.

## Could A Test Sale Complete Today If Containment Were Removed?

Not safely.

A walk-in, one-product, cash-payment sale could only complete if:

1. Product is active.
2. Product has `available_in_store = true`.
3. Selected location exists and is active.
4. Inventory row exists for product/location.
5. `available_quantity >= 1`.
6. Staff has `pos.checkout`.
7. Supabase service-role environment is configured.

Even if all of those were true, the current non-RPC path could still leave partial data if a later write fails after the order insert.

Therefore the sale should not be enabled for production until the RPC path is activated and tested.

## Activation Sequence

1. Confirm current Supabase backup/export checkpoint.
2. Manually execute `supabase/migrations/20260715001300_phase_f4_transactional_hardening.sql`.
3. Verify `transaction_idempotency_keys` exists.
4. Verify `complete_pos_sale_transaction(...)` exists.
5. Verify execute grants are service-role only.
6. Update `completePosSale()` to generate an idempotency key and call the RPC.
7. Map RPC JSON response back to the existing `PosSaleResult` shape.
8. Keep staff auth and `pos.checkout` checks in the Server Action.
9. Run controlled development smoke tests:
   - successful walk-in cash sale
   - insufficient inventory
   - repeated request key/idempotency
   - forced failure rollback
   - permission denied
10. Confirm inventory decrement, ledger row, receipt, payment, order item, and audit event.
11. Confirm products at POS locations have nonzero available inventory.
12. Only then set `launchContainment.posSaleCompletion` to `false`.
13. After RPC paths are verified, plan Phase E production RLS execution.

## Risk Assessment

Current risk with containment enabled:

- Low. The POS can be inspected and used for product/customer/cart preparation, but cannot write a completed sale.

Risk if containment is removed without RPC:

- Critical. Sequential writes can produce partial sales.

Risk after RPC activation and smoke testing:

- Moderate. Remaining work would focus on operational controls, payment integration clarity, receipt delivery, and production RLS enforcement.

## Final Readiness

Ready for Phase 15B: Yes.

Phase 15B should focus on RPC activation planning, Server Action RPC integration, controlled test sale execution, and inventory availability verification.
