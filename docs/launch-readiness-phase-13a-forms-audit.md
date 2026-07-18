# Launch Readiness Phase 13A: Forms Audit

Date: July 17, 2026

Scope: audit only. No application code, SQL, schema, Supabase data, migrations, permissions, or business logic were changed.

## Executive Summary

The ASHE TOKUN form and action surface is not ready for unrestricted production operations yet. The public catalog can render, but the customer-facing product detail page still exposes an Add to Cart control without a completed cart or checkout workflow. The commercial admin workflows have largely moved behind server-side actions, which is the correct direction, but several critical store-operation actions still perform multi-step Supabase writes without a transaction/RPC boundary.

Final recommendation: **NOT READY** for full production launch until the P0 transactional blockers are corrected.

## Totals

- Total forms/action workflows discovered: 47
- P0 launch blockers: 5
- P1 launch blockers: 5
- P2 follow-up issues: 8
- Launch-ready workflows: 26
- Deferred workforce workflows reviewed but not launch-blocking: 11

## P0 Launch Blockers

| Area | File(s) | Root Cause | Risk | Smallest Safe Correction |
| --- | --- | --- | --- | --- |
| POS checkout | `components/admin/AdminPOS.tsx`, `lib/data/posMutations.ts` | `completePosSale()` inserts order, order items, payment, receipt, inventory updates, and inventory ledger rows as separate writes. The mutation returns a critical warning if a later write fails after an order is created. | Partial sale records, payment/order mismatch, or inventory not matching completed sale. | Move POS checkout to one transaction-safe database RPC or equivalent atomic server boundary with idempotency key. |
| Inventory quantity changes | `components/admin/InventoryItemDetail.tsx`, `lib/data/inventoryMutations.ts` | Adjust, receive, and transfer update inventory rows and then insert ledger rows separately. Transfer also updates source and destination separately. | Stock quantity can change without a matching ledger, or transfer can partially apply. | Use atomic inventory RPCs for adjust, receive, and transfer. Keep server action validation as the caller. |
| Shipment creation | `components/admin/ShipmentCreationWizard.tsx`, `lib/data/shippingMutations.ts` | `createShipment()` inserts shipment, items, addresses, packages, events, and audit rows separately. Later failures leave a created shipment needing manual repair. | Incomplete fulfillment records, missing addresses/packages, misleading shipment state. | Move shipment creation into a transaction-safe RPC or server-side transaction boundary. |
| Returns creation/completion | `components/admin/ReturnCreationWizard.tsx`, `lib/data/returnMutations.ts` | Return creation inserts header and items separately. Return completion can restore inventory, create refund/store-credit/exchange records, and then fail before final status update. | Partial return records, duplicated manual recovery, inventory/refund mismatch. | Use atomic RPCs for return creation and return completion. Preserve existing validation. |
| Completed order cancellation | `components/admin/OrderDetailActions.tsx`, `lib/data/orderMutations.ts` | `cancelOrder()` restores inventory rows and ledger rows before updating the order to cancelled. The catch explicitly reports that a production RPC/database transaction is required. | Completed POS order can be partially restored or cancelled inconsistently. | Move completed-order cancellation/restoration into an atomic RPC. |

## P1 Launch Blockers

| Area | File(s) | Root Cause | Impact | Smallest Safe Correction |
| --- | --- | --- | --- | --- |
| Public product Add to Cart | `components/shop/ProductDetailPage.tsx` | Visible Add to Cart button has no completed cart/checkout path. | Customer-facing CTA appears functional but cannot complete commerce. | Hide/disable with honest copy or wire it to a real cart workflow before launch. |
| Product edit validation | `components/admin/EditProductForm.tsx`, `lib/data/productMutations.ts` | Client blocks negative `price`, but update mutation does not fully validate compare-at price, cost, stock, reorder level, SKU/barcode, or required lookup integrity like create does. | Invalid commercial product data can be saved through edit paths. | Reuse create/update validation rules server-side for editable fields. |
| Product media primary switching | `lib/data/productMediaMutations.ts` | Primary-image updates can demote the current primary before the replacement path fully succeeds. | Product can temporarily lose intended primary image on failure. | Wrap primary-image switch in one transaction-safe operation. |
| Shipping origin default changes | `components/admin/ShippingOriginsManager.tsx`, `components/admin/ShippingOriginForm.tsx`, `lib/data/shippingOriginMutations.ts` | Setting a default clears other defaults and then updates the selected origin separately. | Failure can leave no default origin or misleading fulfillment defaults. | Make default-origin change atomic. |
| Commercial form bilingual coverage | Multiple admin detail/action forms | Several action forms and detail views still contain hardcoded English strings after the main bilingual pass. | Spanish admin experience is incomplete in operational forms. | Continue EN/ES pass for remaining action modals, validation messages, and detail pages. |

## P2 Follow-Up Issues

| Area | File(s) | Issue | Recommendation |
| --- | --- | --- | --- |
| Return creation client validation | `components/admin/ReturnCreationWizard.tsx` | Create button can submit with missing return items/reason and relies on server rejection. | Add client disabled state and inline field errors matching server validation. |
| Customer form messaging | `components/admin/CustomerForm.tsx` | Some edit failures use create-oriented wording. | Split create/edit messages. |
| Inventory forms | `components/admin/InventoryItemDetail.tsx` | Client and server validation are good, but high-risk actions need stronger success/error context after server failure. | Add clearer critical-state messaging after atomic backend is implemented. |
| Shipping wizard | `components/admin/ShipmentCreationWizard.tsx` | Client validation is strong, but retry behavior after partial server failure is not recoverable by UI alone. | Pair with atomic shipment creation and add duplicate-submit idempotency. |
| POS duplicate submit | `components/admin/AdminPOS.tsx` | UI uses pending state, but server does not enforce idempotency. | Add server-side sale idempotency key with atomic checkout. |
| Payroll period forms | `components/admin/PayrollPeriodForm.tsx`, `components/admin/AdminPayrollDashboard.tsx` | Payroll is preserved but no longer part of normal commercial admin launch. | Keep hidden/deferred unless payroll is reintroduced. |
| Scheduling/timekeeper forms | Scheduling and timekeeper components | Workforce modules are preserved but hidden from normal commercial admin. | Do not treat as storefront launch blockers. |
| Public contact/newsletter/customer registration | Public app routes/components | No active forms were discovered. | No action required unless these are part of launch scope. |

## Complete Form and Action Inventory

| # | Workflow | Primary Files | Boundary | Status |
| --- | --- | --- | --- | --- |
| 1 | Public Product Add to Cart | `components/shop/ProductDetailPage.tsx` | Client UI only | P1 |
| 2 | Product Creation Wizard | `components/admin/ProductCreationWizard.tsx`, `lib/data/productMutations.ts` | Server action | Launch-ready |
| 3 | Product Edit | `components/admin/EditProductForm.tsx`, `lib/data/productMutations.ts` | Server action | P1 |
| 4 | Product Media Link/Gallery | `components/admin/EditProductForm.tsx`, `lib/data/productMediaMutations.ts` | Server action | P1 |
| 5 | Media Upload | `components/admin/MediaLibraryManager.tsx`, `lib/storage/mediaStorageActions.ts` | Server action | Launch-ready |
| 6 | Inventory Item Create/Upsert | `lib/data/inventoryMutations.ts` | Server action | Launch-ready with P0 dependency |
| 7 | Inventory Adjustment | `components/admin/InventoryItemDetail.tsx`, `lib/data/inventoryMutations.ts` | Server action | P0 |
| 8 | Inventory Receiving | `components/admin/InventoryItemDetail.tsx`, `lib/data/inventoryMutations.ts` | Server action | P0 |
| 9 | Inventory Transfer | `components/admin/InventoryItemDetail.tsx`, `lib/data/inventoryMutations.ts` | Server action | P0 |
| 10 | Reorder Level Update | `components/admin/InventoryItemDetail.tsx`, `lib/data/inventoryMutations.ts` | Server action | Launch-ready |
| 11 | POS Sale Completion | `components/admin/AdminPOS.tsx`, `lib/data/posMutations.ts` | Server action | P0 |
| 12 | Customer Create | `components/admin/CustomerForm.tsx`, `lib/data/customerMutations.ts` | Server action | Launch-ready |
| 13 | Customer Edit | `components/admin/CustomerForm.tsx`, `lib/data/customerMutations.ts` | Server action | P2 |
| 14 | Customer Address Add/Edit/Delete/Default | `components/admin/CustomerDetailManager.tsx`, `lib/data/customerMutations.ts` | Server action | Launch-ready |
| 15 | Customer Note | `components/admin/CustomerDetailManager.tsx`, `lib/data/customerMutations.ts` | Server action | Launch-ready |
| 16 | Customer Status Actions | `components/admin/CustomerDetailManager.tsx`, `lib/data/customerMutations.ts` | Server action | Launch-ready |
| 17 | Order List Actions | `components/admin/AdminOrdersManager.tsx`, `lib/data/orderMutations.ts` | Server action | Launch-ready except completed cancellation |
| 18 | Order Note | `components/admin/OrderDetailActions.tsx`, `lib/data/orderMutations.ts` | Server action | Launch-ready |
| 19 | Order Payment Status | `components/admin/OrderDetailActions.tsx`, `lib/data/orderMutations.ts` | Server action | Launch-ready |
| 20 | Order Hold/Complete Held | `components/admin/OrderDetailActions.tsx`, `lib/data/orderMutations.ts` | Server action | Launch-ready |
| 21 | Order Cancellation | `components/admin/OrderDetailActions.tsx`, `lib/data/orderMutations.ts` | Server action | P0 for completed orders |
| 22 | Shipping Origin Create/Edit | `components/admin/ShippingOriginForm.tsx`, `lib/data/shippingOriginMutations.ts` | Server action | Launch-ready |
| 23 | Shipping Origin Activate/Deactivate/Default | `components/admin/ShippingOriginsManager.tsx`, `lib/data/shippingOriginMutations.ts` | Server action | P1 |
| 24 | Shipment Creation Wizard | `components/admin/ShipmentCreationWizard.tsx`, `lib/data/shippingMutations.ts` | Server action | P0 |
| 25 | Shipment Status/Tracking/Package Actions | Shipping admin components, `lib/data/shippingMutations.ts` | Server action | Launch-ready with transaction follow-up |
| 26 | Return Creation Wizard | `components/admin/ReturnCreationWizard.tsx`, `lib/data/returnMutations.ts` | Server action | P0/P2 |
| 27 | Return Approval/Cancel/Notes | Return admin components, `lib/data/returnMutations.ts` | Server action | Launch-ready |
| 28 | Return Receiving | Return admin components, `lib/data/returnMutations.ts` | Server action | P1 |
| 29 | Return Completion | Return admin components, `lib/data/returnMutations.ts` | Server action | P0 |
| 30 | Store Operations Login | Staff auth components, `lib/staff/staffAuthService.ts` | Server action | Launch-ready |
| 31 | First-login PIN Change | Staff auth components, staff auth mutations | Server action | Launch-ready |
| 32 | Logout | Staff session actions | Server action/route handler | Launch-ready |
| 33 | User Access Create | User access components, staff mutations | Server action | Deferred known issue |
| 34 | User Access Edit | User access components, staff mutations | Server action | Launch-ready for existing users |
| 35 | Reset PIN | User access components, staff mutations | Server action | Launch-ready |
| 36 | User Activate/Deactivate/Archive/Restore/Sessions/Unlock | User access components, staff mutations | Server action | Launch-ready |
| 37 | Permissions Update | User access components, permission mutations | Server action | Launch-ready |
| 38 | Permissions Clone | User access components, permission mutations | Server action | Launch-ready |
| 39 | Payroll Period Create | `components/admin/PayrollPeriodForm.tsx` | Server action | Deferred |
| 40 | Payroll Generate/Refresh/Approve/Close/Reopen/Export | Payroll components, payroll mutations/routes | Server action/API GET | Deferred |
| 41 | Schedule Period Create/Update/Publish | Scheduling components/mutations | Server action | Deferred |
| 42 | Shift Create/Update/Cancel/Reassign | Scheduling components/mutations | Server action | Deferred |
| 43 | Availability Update | Availability components/mutations | Server action | Deferred |
| 44 | Time-off Submit/Review | Time-off components/mutations | Server action | Deferred |
| 45 | Timekeeper Punch | Timekeeper components/mutations | Server action | Deferred |
| 46 | Manual Punch/Correction | Timekeeper admin components/mutations | Server action | Deferred |
| 47 | Timecard Submit/Approve/Reopen/Exception Resolution | Timekeeper components/mutations | Server action | Deferred |

## Public Website Forms

No active public contact, newsletter, customer registration, login, shipping, billing, payment, or order-confirmation forms were discovered in the current application surface. The visible customer-facing commerce action is the product detail Add to Cart button, which is not connected to a completed cart/checkout flow.

## Server Boundary Findings

- Most commercial admin writes now go through Server Actions and `requireServerActionPermission()`.
- No browser-side service-role client usage was found in the audited form paths.
- Repository/mutation boundaries are materially improved from earlier phases.
- The remaining production risk is primarily transactional integrity, not client exposure.

## Launch-Ready Forms

The following were judged launch-ready from a form-security and validation perspective, assuming the P0 transaction dependencies are addressed where noted:

- Product creation
- Media upload
- Customer create/edit/address/note/status actions
- Order note, payment status, hold, and complete-held actions
- Shipping origin create/edit
- Shipment status/tracking/package follow-up actions
- Return approval/cancel/note actions
- Store Operations login, PIN change, logout
- Existing User Access management for current launch roles

## Could Not Verify

- Live browser behavior was not exercised against Supabase data because the task forbids modifying data and creating uncontrolled test records.
- Safari-specific UI behavior was not re-tested in this phase.
- No automated test suite exists in `package.json`; only lint and build are available.

## Deferred Items

These are intentionally not launch blockers under the Phase 13A instruction:

- Managing Partner cannot currently create a new user and receives "Staff member could not be created."
- Visible role selector ends at Cashier.
- Future roles Inventory, Fulfillment, and Customer Service remain deferred.
- Only Owner, Managing Partner, and one Store Manager are required for launch.
- Location label Local Inventory may later become Front Store.
- Payroll, Scheduling, Timekeeper, Availability, and Time Off are preserved but hidden from normal commercial admin operations.

## Verification

- `npm run lint`: Passed
- `npm run build`: Passed after rerun with network access for Next.js Google font fetching. The first sandboxed build failed only because `next/font` could not fetch `Geist` and `Geist Mono`.
- SQL executed: No
- Migrations applied: No
- Data modified: No
- Commits created: No

## Final Recommendation

**NOT READY** for full production launch.

The codebase is close on authorization boundaries, but production should not process live POS sales, inventory adjustments/transfers, shipments, returns, or completed-order cancellations until the P0 multi-step write paths are made transaction-safe.
