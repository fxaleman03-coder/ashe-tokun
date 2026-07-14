# Launch Readiness Phase F.2: Returns, Shipping & Shipping Origins Server Actions

Date: July 14, 2026

Scope: Move the current Admin Returns, Shipping, and Shipping Origin mutation workflows behind authenticated Server Actions while preserving existing UI behavior, order behavior, inventory behavior, refund behavior, return behavior, shipping behavior, tracking behavior, customer behavior, and business rules.

No SQL was executed. No migrations were created or applied. No schema or Supabase data was modified.

## Executive Summary

Phase F.2 migrated the remaining Returns, Shipping, and Shipping Origin write modules from browser-side anon Supabase writes to server-side actions that use the Supabase service-role client only after staff authentication and permission validation.

Existing UI call sites were preserved:

- `AdminReturnsManager`
- `ReturnCreationWizard`
- `ReturnDetailManager`
- `AdminShippingManager`
- `ShipmentCreationWizard`
- `ShipmentDetailManager`
- `ShippingOriginsManager`
- `ShippingOriginForm`

The components still call the same exported mutation functions, but those functions now run on the server.

## Returns Write Inventory

Current supported return writes found:

- `createReturn(input)`
- `approveReturn(returnId, notes)`
- `receiveReturn(returnId, receivedItems)`
- `completeReturn(returnId, completionInput)`
- `cancelReturn(returnId, reason)`
- `addReturnNote(returnId, note)`

Tables written during return workflows:

- `returns`
- `return_items`
- `inventory_items`
- `inventory_transactions`
- `gift_cards`
- `payments`
- `audit_logs`

Permission mapping:

| Mutation | Permission |
| --- | --- |
| `createReturn` | `returns.create` |
| `approveReturn` | `returns.approve` |
| `cancelReturn` | `returns.approve` |
| `addReturnNote` | `returns.approve` |
| `receiveReturn` | `returns.complete` |
| `completeReturn` | `returns.complete` |

## Shipping Write Inventory

Current supported shipment writes found:

- `createShipment(input)`
- `updateShipmentStatus(shipmentId, status, notes)`
- `addShipmentPackage(shipmentId, packageInput)`
- `updateShipmentPackage(packageId, updates)`
- `removeShipmentPackage(packageId)`
- `addTrackingInformation(shipmentId, input)`
- `addShipmentEvent(shipmentId, event)`
- `cancelShipment(shipmentId, reason)`
- `markShipmentDelivered(shipmentId, deliveredAt)`
- `createLocalPickup(orderId, input)`
- `markPickupReady(shipmentId)`
- `markPickupCompleted(shipmentId)`

Tables written during shipment workflows:

- `shipments`
- `shipment_items`
- `shipment_addresses`
- `shipment_packages`
- `shipment_events`
- `audit_logs`

Permission mapping:

| Mutation | Permission |
| --- | --- |
| `createShipment` | `shipping.create` |
| `createLocalPickup` | `shipping.create` |
| shipment status, package, tracking, event, cancel, delivery, pickup updates | `shipping.edit` |

## Shipping Origin Write Inventory

Current supported origin writes found:

- `createShippingOrigin(input)`
- `updateShippingOrigin(id, updates)`
- `activateShippingOrigin(id)`
- `deactivateShippingOrigin(id)`
- `setDefaultShippingOrigin(id)`

Tables written during origin workflows:

- `shipping_origins`

Permission mapping:

| Mutation | Permission |
| --- | --- |
| all shipping origin mutations | `shipping.origins.manage` |

## Mutations Migrated

Updated:

- `lib/data/returnMutations.ts`
- `lib/data/shippingMutations.ts`
- `lib/data/shippingOriginMutations.ts`

Changes:

- Converted mutation modules from `"use client"` to `"use server"`.
- Replaced the shared anon Supabase client with `createSupabaseServiceClient()`.
- Added `requireServerActionPermission()` checks.
- Added targeted revalidation for Returns, Shipping, Orders, and Shipping Origins admin paths.
- Preserved existing validation, transition rules, refund/store-credit behavior, inventory restoration behavior, tracking URL behavior, shipment creation behavior, and origin validation behavior.

Created:

- `lib/utils/shippingTracking.ts`

The tracking URL helper was split out so Client Components can keep using it for live tracking previews while the shipping mutation module remains server-only.

## Client Cleanup

Removed browser-side Supabase writes from:

- `lib/data/returnMutations.ts`
- `lib/data/shippingMutations.ts`
- `lib/data/shippingOriginMutations.ts`

Client Components still import those modules for actions, but privileged Supabase writes now execute server-side.

## Preserved Behavior

The migration intentionally did not change:

- return eligibility rules
- return status transitions
- refund amount rules
- exchange tracking behavior
- store-credit issuance behavior
- return inventory restock rules
- shipment status transitions
- package validation
- local pickup rules
- tracking URL generation
- shipping origin completion/default rules
- order/customer relationships
- PDFs, labels, or visible UI layouts

## Error Handling

The migrated actions continue returning existing result shapes:

- success result
- friendly validation errors
- critical partial-failure flag when a parent record was already created
- manual review messaging for multi-step failures

Raw Supabase errors were removed from the most exposed partial-failure messages in the migrated write paths.

## Transaction Boundary Findings

Returns and shipping still perform multi-step writes.

Return completion can update inventory, create inventory ledger rows, issue store credit, record refunds, and update return status. Shipment creation can insert the shipment, shipment items, address snapshots, package rows, events, and audit logs.

Production recommendations:

- Replace return completion with a transaction-safe RPC/database function before live operational use.
- Replace shipment creation with a transaction-safe RPC/database function before live operational use.
- Keep Server Actions as the authenticated boundary that validates permissions and calls future RPCs.

## Remaining Browser Writes

No Returns, Shipping, or Shipping Origin browser-side Supabase writes remain in the migrated mutation modules.

Known remaining legacy item:

- browser-capable `lib/storage/mediaStorage.ts` remains in source until fully retired.

## Readiness for Phase E RLS Hardening

Improved.

Now safer to harden:

- Admin Returns mutation paths.
- Admin Shipping mutation paths.
- Admin Shipping Origin mutation paths.

Still requiring review before production execution:

- Multi-step return and shipping workflows should become atomic.
- Legacy browser-capable media helper remains until fully retired.
- Repository read access should be reviewed alongside the production RLS execution plan.

## Verification

Required:

- `npm run lint`
- `npm run build`

Manual behavior checks recommended:

- create return
- approve return
- receive return items
- complete refund return
- complete store-credit return
- complete exchange return
- cancel return
- add return note
- create shipment
- update shipment status
- add tracking
- add shipment event
- cancel shipment
- create shipping origin
- edit shipping origin
- activate/deactivate origin
- set default origin
