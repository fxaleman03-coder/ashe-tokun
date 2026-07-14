# Launch Readiness Phase F.1: Orders & Customers Server Actions

Date: July 14, 2026

Scope: Move current Admin Orders and Admin Customers browser-side Supabase writes behind authenticated Server Actions.

No SQL was executed. No migrations were created or applied. No schema or Supabase data was modified.

## Executive Summary

Phase F.1 migrated current Admin Orders and Admin Customers mutation modules from browser-side anon Supabase writes to server-side actions that use the service-role client only after staff authentication and permission validation.

The existing UI call sites were preserved:

- `AdminOrdersManager`
- `OrderDetailActions`
- `CustomerForm`
- `CustomerDetailManager`

The components still call the same functions, but those functions now run on the server.

## Current Mutation Inventory

### Orders

Current supported writes found:

- `updateOrderStatus(orderId, status, notes)`
- `updatePaymentStatus(orderId, status, notes)`
- `addOrderNote(orderId, note)`
- `holdOrder(orderId, reason)`
- `completeHeldOrder(orderId)`
- `cancelOrder(orderId, reason)`

No active Admin UI write paths were found for:

- create order
- edit line items
- remove line items
- assign customer
- archive order
- fulfillment metadata
- shipping metadata

Those are not implemented in the current Admin Orders mutation surface.

### Customers

Current supported writes found:

- `createCustomer(input)`
- `updateCustomer(customerId, updates)`
- `deactivateCustomer(customerId)`
- `reactivateCustomer(customerId)`
- `addCustomerNote(customerId, note)`
- `createCustomerAddress(input)`
- `updateCustomerAddress(addressId, updates)`
- `deleteCustomerAddress(addressId)`
- `setDefaultCustomerAddress(customerId, addressId)`

No current customer merge/deduplication or tag mutation flow was found.

## Orders Mutations Migrated

Updated:

- `lib/data/orderMutations.ts`

Changes:

- Converted the module from `"use client"` to `"use server"`.
- Replaced the shared anon client with `createSupabaseServiceClient()`.
- Added `requireServerActionPermission()` checks.
- Added targeted revalidation for:
  - `/admin`
  - `/admin/orders`
  - `/admin/orders/[id]`
- Preserved status transition rules.
- Preserved payment status metadata behavior.
- Preserved cancellation inventory restoration behavior.
- Preserved audit event inserts using the existing `audit_logs` shape.

## Customers Mutations Migrated

Updated:

- `lib/data/customerMutations.ts`

Changes:

- Converted the module from `"use client"` to `"use server"`.
- Replaced the shared anon client with `createSupabaseServiceClient()`.
- Added `requireServerActionPermission()` checks.
- Added targeted revalidation for:
  - `/admin`
  - `/admin/customers`
  - `/admin/customers/[id]`
- Preserved customer identity rules.
- Preserved walk-in customer protections.
- Preserved email normalization and duplicate-email checks.
- Preserved customer number generation behavior.
- Preserved address defaulting behavior.
- Preserved customer audit event inserts.

## Permission Mapping

| Mutation | Permission |
| --- | --- |
| `updateOrderStatus` | `orders.edit` |
| `updatePaymentStatus` | `orders.edit` |
| `addOrderNote` | `orders.edit` |
| `holdOrder` | `orders.edit` through `updateOrderStatus` |
| `completeHeldOrder` | `orders.edit` through `updateOrderStatus` |
| `cancelOrder` | `orders.cancel` |
| `createCustomer` | `customers.create` |
| `updateCustomer` | `customers.edit` |
| `deactivateCustomer` | `customers.edit` |
| `reactivateCustomer` | `customers.edit` |
| `addCustomerNote` | `customers.edit` |
| customer address create/update/delete/default | `customers.edit` |

No new permissions were added.

## Public Storefront Boundary Findings

No public storefront checkout/customer mutation flow was changed in this phase.

Findings:

- Admin Orders and Admin Customers now use staff-only Server Actions.
- POS still has its own browser-side mutation module and is intentionally deferred because it requires a larger transactional order/payment/inventory boundary.
- Public storefront order/customer writes were not migrated here; no safe public checkout auth model was introduced.

## Browser Writes Removed

Removed browser-side Supabase writes from:

- `lib/data/orderMutations.ts`
- `lib/data/customerMutations.ts`

The Client Components still import those modules, but the functions are now Server Actions.

## Remaining Browser Writes

Still pending after Phase F.1:

- `lib/data/posMutations.ts`
- `lib/data/returnMutations.ts`
- `lib/data/shippingMutations.ts`
- `lib/data/shippingOriginMutations.ts`
- legacy browser-capable `lib/storage/mediaStorage.ts`

## Validation Behavior

Orders:

- status enum validation remains server-side
- payment status enum validation remains server-side
- cancellation reason remains required
- invalid transitions remain blocked
- completed-order cancellation still checks restoration history and sale transactions

Customers:

- customer type validation remains server-side
- email format and duplicate checks remain server-side
- first name or company name remains required for non-walk-in records
- walk-in customer protections remain server-side
- address required fields remain server-side

## Audit Behavior

Preserved audit events:

- `order_status_updated`
- `payment_status_updated`
- `order_note_added`
- `order_cancelled`
- `customer_created`
- `customer_updated`
- `customer_deactivated`
- `customer_reactivated`
- `customer_note_added`

Known audit gap:

- Customer address changes currently do not create explicit audit events.
- Order cancellation inventory restoration rows are still multi-step and should become transactional before production.

## Remaining Security Risks

- POS remains browser-side and touches orders, order items, payments, receipts, inventory quantities, and ledger rows.
- Returns and Shipping remain browser-side.
- Order cancellation restoration is still not an atomic database transaction.
- Phase E production RLS should not be fully applied until POS, Returns, and Shipping are migrated or intentionally isolated.

## Readiness for Phase E RLS Hardening

Improved, but not complete.

Now safer to harden:

- Admin Orders management policies.
- Admin Customers management policies.

Still not ready for full production RLS execution:

- POS depends on browser-side commerce writes.
- Returns depends on browser-side return/refund writes.
- Shipping depends on browser-side fulfillment writes.

## Verification

Required:

- `npm run lint`
- `npm run build`

Manual behavior checks recommended:

- order list loads
- order detail loads
- hold order
- complete held order
- update payment status
- add order note
- cancel order with reason
- customer list loads
- customer detail loads
- create customer
- edit customer
- deactivate/reactivate customer
- create/update/delete/default customer address
- add customer note
