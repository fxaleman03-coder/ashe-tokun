# ASHE TOKUN Supabase Execution Checklist

This checklist is for the first future manual execution of `supabase/schema.sql` in Supabase. It does not connect the app to Supabase, replace local data, or enable live writes.

## 1. Pre-Execution Checklist

- Confirm the Supabase project exists.
- Confirm `.env.local` exists locally.
- Confirm `NEXT_PUBLIC_SUPABASE_URL` is present in `.env.local`.
- Confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` is present in `.env.local`.
- Confirm the local app still works with `USE_SUPABASE = false`.
- Confirm `npm run lint` passes.
- Confirm `npm run build` passes.
- Confirm latest code is committed and pushed.
- Confirm `supabase/schema.sql` has been reviewed.

## 2. Execution Steps

1. Open the Supabase SQL Editor.
2. Copy the full contents of `supabase/schema.sql`.
3. Run the SQL once.
4. Save the Supabase SQL Editor output.
5. Do not run the SQL repeatedly without reviewing the previous output and current database state.

## 3. Post-Execution Verification

- Confirm tables exist.
- Confirm seed data exists:
  - AJAKO ORIGINALS
  - EDIBERE CREATION
  - Inventory locations
  - Florida Sales Tax Placeholder
  - Admin staff placeholder
- Confirm indexes exist.
- Confirm triggers exist.
- Confirm RLS is not enabled yet.
- Confirm no app behavior changed.

If the `brands` table is empty after schema execution, run `supabase/seed-brands.sql` once in the Supabase SQL Editor.

If the app can connect but reads zero brands while SQL Editor shows active rows, run `supabase/policies-brands-read.sql` to allow anon public reads for active brands.

If the app can connect but reads zero categories while SQL Editor shows active rows, run `supabase/policies-categories-read.sql` to allow anon public reads for active categories.

If the app can connect but reads zero collections while SQL Editor shows active rows, run `supabase/policies-collections-read.sql` to allow anon public reads for active collections.

If the app can connect but reads zero product types while SQL Editor shows active rows, run `supabase/policies-product-types-read.sql` to allow anon public reads for active product types.

If the app can connect but reads zero traditions while SQL Editor shows active rows, run `supabase/policies-traditions-read.sql` to allow anon public reads for active traditions.

## Product Migration Engine

Run the local catalog product migration only after brands, categories, traditions, and product types exist in Supabase and their read policies are configured.

Product migration write policy:
Run `supabase/policies-products-migration-write.sql` only in development before running product migration. This temporary policy allows product upserts for the migration and must be removed or replaced before production.

Product Studio update policy:
Before testing Product Studio Supabase saves in development, run `supabase/policies-products-admin-update.sql`. This temporary policy must be replaced with authenticated admin role policies before production.

## Phase 7.2 Product Creation

Before testing product creation in development, run `supabase/policies-products-admin-insert.sql`. This temporary policy allows Product Creation Wizard inserts and must be replaced with authenticated admin role policies before production.

## Phase 7.3 Supabase Storage Setup

Before testing Media Library uploads in development, create the Supabase Storage bucket:

- Bucket name: `product-media`
- Public bucket: enabled
- Maximum file size: 20 MB
- Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

Manual execution order:

1. Run `supabase/setup-product-media-bucket.sql`.
2. Run `supabase/storage-policy-product-media.sql`.
3. Run `supabase/policies-media-assets-development.sql`.
4. Restart localhost.
5. Test one image upload from `/admin/media`.

These temporary development policies allow public reads, Media Library uploads, and `media_assets` record creation. Replace them with authenticated admin role policies before production.

Uploaded product images use this storage shape:

```text
product-media/
  brands/
    ajako-originals/
      uploads/
    edibere-creation/
      uploads/
```

Public URLs must remain enabled for `product-media` so the storefront and Product Studio can render uploaded assets while Supabase Storage is being introduced.

## Phase 7.3C Product Media Linking

Before testing permanent primary image linking in development:

1. Run `supabase/policies-product-media-development.sql`.
2. Restart localhost.
3. Create or edit one product.
4. Select one Supabase media asset.
5. Verify the relationship in `product_media`.
6. Verify the image appears on Homepage and Product Detail through the Product Repository.

This phase uses the existing `products -> product_media -> media_assets` relationship and the existing unique partial index that allows one primary image per product.

## Phase 7.5A Local Media Migration

Run the local commercial product image migration only after Supabase Storage and `media_assets` development policies are configured:

```bash
npm run migrate:media -- --confirm
```

This migration scans only `public/products` for `.jpg`, `.jpeg`, `.png`, and `.webp` files. It uploads commercial product images into the `product-media` bucket under `legacy-products/...` and creates or updates matching `media_assets` records by `storage_path`.

Warnings:

- Development migration only.
- Local files remain unchanged.
- Product relationships are not created automatically.
- Product linking continues manually through Product Studio or Product Creation Wizard.
- Manufacturing files such as STL, 3MF, SVG production files, LightBurn, Fusion 360, laser templates, and BOM files are not part of ASHE TOKUN commercial media migration.

## Phase 8.1 Live Inventory Activation

Run the inventory activation steps only after products exist in Supabase:

1. Run the development inventory policies in Supabase SQL Editor:

```text
supabase/policies-inventory-development.sql
```

2. Run the inventory migration without confirmation:

```bash
npm run migrate:inventory
```

Expected result: the safety warning prints and no writes occur.

3. Run the confirmed inventory migration:

```bash
npm run migrate:inventory -- --confirm
```

4. Verify:

- `inventory_items` contains live rows.
- `inventory_transactions` contains opening balance rows.
- `/admin/inventory` shows `Data Source: Supabase`.

5. Test:

- One manual adjustment.
- One receiving transaction.
- One reorder-level change.
- Transaction history on `/admin/inventory/[id]`.

Do not test POS deductions yet. POS stock deduction and sale-linked inventory transactions remain reserved for a later phase.

Schema note: the current `inventory_transactions.reference_id` column is UUID, so the migration uses a stable UUID marker for Phase 8.1 and stores the human phase label `phase-8-1` in notes/performed_by.

## Phase 8.2 Inventory Transfers

Test checklist:

1. Open one product inventory item.
2. Confirm source available stock.
3. Transfer 1 unit from Main Stockroom to Retail Floor.
4. Verify source decreases by 1.
5. Verify destination increases by 1.
6. Verify the source `transfer_out` transaction.
7. Verify the destination `transfer_in` transaction.
8. Confirm both rows share the same transfer reference UUID.
9. Confirm source stock never becomes negative.
10. Confirm Product Studio summary reflects all locations.

Transfers are currently implemented through client-side development Supabase writes. A database RPC or transaction should be added before production to guarantee atomic multi-step transfers across the source update, destination update, and both ledger rows.

## Phase 9.1 Live POS

Manual order:

1. Run `supabase/policies-pos-development.sql`.
2. Restart localhost.
3. Open `/admin/pos`.
4. Select Retail Floor.
5. Add one product with available stock.
6. Complete a small cash sale.
7. Verify one order.
8. Verify order items.
9. Verify one payment.
10. Verify one receipt.
11. Verify inventory decreased.
12. Verify the sale inventory transaction.
13. Verify the order appears in `/admin/orders`.

Development warnings:

- Do not test online checkout in this phase.
- Do not test refunds or returns in this phase.
- A database RPC/transaction is required before production to guarantee atomic sale completion across order, items, payment, receipt, inventory updates, and inventory ledger rows.
- If a development sale fails after an order is created, review the returned order number and reconcile manually before more testing.

## Phase 9.2 Orders Management

Manual order:

1. Run `supabase/policies-orders-management-development.sql`.
2. Restart localhost.
3. Open `/admin/orders`.
4. Open the POS test order.
5. Add a note.
6. Verify timeline.
7. Test a held order transition if available.
8. Cancel one controlled completed POS order.
9. Verify `order_status = cancelled`.
10. Verify inventory restored.
11. Verify return/restoration ledger rows.
12. Verify original sale ledger rows remain.
13. Confirm cancelled order is excluded from revenue metrics.

Warning: order cancellation must use a database transaction/RPC before production. The current implementation is safe sequential development logic and must not be treated as production-atomic.

## Phase 9.3 Customer Management

Manual order:

1. Run `supabase/policies-customers-development.sql`.
2. Restart localhost.
3. Open `/admin/customers`.
4. Verify Walk-in Customer exists.
5. Create one registered test customer.
6. Add one address.
7. Set default address.
8. Edit customer.
9. Select customer in POS.
10. Complete one small test sale.
11. Verify order appears in customer purchase history.
12. Verify lifetime value and order count update.
13. Deactivate customer.
14. Confirm customer disappears from active POS search.
15. Reactivate customer.
16. Confirm historical orders remain.

Warning: customer data includes personal information. Development policies use broad anonymous access for local testing only. Before production, restrict customer records to authenticated staff with role-based RLS, audit logging, encrypted transport, secure backups, a privacy policy, and a data retention policy.

## Phase 9.4 Returns, Exchanges, and Refund Foundation

Manual order:

1. Run `supabase/policies-returns-development.sql`.
2. Confirm `supabase/policies-pos-development.sql` has already been run for orders, order items, payments, and receipts.
3. Confirm `supabase/policies-inventory-development.sql` has already been run for inventory items and inventory transactions.
4. Restart localhost.
5. Complete one small POS test sale.
6. Open `/admin/returns/new`.
7. Select the original order.
8. Select returnable items and quantities.
9. Create a return request.
10. Approve the return.
11. Receive the return and mark each item condition.
12. Complete the return as refund, exchange, or store credit.
13. Verify completed return quantities reduce future returnable quantity.
14. Verify restockable conditions create `inventory_transactions` rows with `transaction_type = 'return'` and `reference_type = 'Customer Return'`.
15. Verify non-restockable conditions do not increase sellable inventory.
16. Verify order detail and customer detail show linked returns.

Warning: refunds are administrative records only. Card, bank, Stripe, Square, PayPal, and external payment refunds must be processed manually outside the app in this phase. Return completion currently uses sequential development writes; before production, move return status, inventory restoration, payment records, store credit, and audit logging into a database RPC/transaction so partial failures cannot leave records out of sync.

## Phase 9.5 Shipping & Fulfillment

Manual order:

1. Run `supabase/migrations/phase-9-5-shipping.sql`.
2. Run `supabase/policies-shipping-development.sql`.
3. Add local shipping-from variables to `.env.local`.
4. Restart localhost.
5. Open one eligible order.
6. Create one shipment.
7. Select one item.
8. Add one package.
9. Add manual tracking.
10. Mark ready.
11. Mark packed.
12. Mark shipped.
13. Mark in transit.
14. Mark delivered.
15. Verify order fulfillment summary.
16. Verify customer shipment history.
17. Test one local pickup.
18. Test one partial shipment.
19. Confirm over-fulfillment is blocked.
20. Confirm cancelled shipment quantities become fulfillable again.

Warning: real carrier rates, label purchase, label printing, external refund-like shipping adjustments, and tracking webhooks remain deferred. Shipment creation currently uses strict sequential development logic across shipments, items, address snapshots, packages, events, and audit logs. Before production, move shipment creation and fulfillment status changes into database RPCs/transactions so partial failures cannot leave records out of sync. Shipment number generation is application-side in this phase; use a database sequence or RPC before production concurrency.

## Phase 9.5A Multi-Origin Shipping

Manual order:

1. Run `supabase/migrations/phase-9-5a-shipping-origins.sql`.
2. Run `supabase/policies-shipping-origins-development.sql`.
3. Run `supabase/migrations/phase-9-5a-correct-edibere-name.sql` if live Supabase still has prior EDIBERE naming variants.
4. Restart localhost.
5. Open `/admin/settings/shipping-origins`.
6. Complete ASHE TOKUN origin.
7. Complete AJAKO ORIGINALS origin.
8. Complete EDIBERE CREATION origin.
9. Mark one origin as default.
10. Open shipment wizard.
11. Select one origin.
12. Confirm fields auto-populate.
13. Select Ship To separately.
14. Confirm quantity input accepts `1` cleanly.
15. Create shipment.
16. Verify `shipping_origin_id`.
17. Verify ship_from snapshot.
18. Edit origin afterward.
19. Confirm historical shipment snapshot does not change.
20. Test local pickup.

Warning: shipping origins and addresses require authenticated role-based access before production. The seeded official origins intentionally do not include private address data and must be completed manually before activation.

## Phase 7.4A Public Product Reads

Before testing public product reads in development, run:

```text
supabase/policies-products-public-read.sql
```

Expected result: the Product Repository should return active, online products from Supabase instead of local fallback. The public read query expects:

- `active = true`
- `status = 'active'`
- `available_online = true`

```bash
npm run migrate:products -- --confirm
```

This writes products to Supabase with SKU conflict protection. Do not run it until the lookup tables are ready and the migration output can be reviewed.

## Phase 10.2 Staff PIN Authentication

Manual setup order:

1. Run `supabase/migrations/phase-10-1-staff-foundation.sql` if it has not already been executed.
2. Run `supabase/migrations/phase-10-2-staff-auth.sql`.
3. Configure the server-only service role key in `.env.local`:

```text
SUPABASE_SERVICE_ROLE_KEY=
STAFF_SESSION_HOURS=10
STAFF_INACTIVITY_MINUTES=30
STAFF_MAX_FAILED_ATTEMPTS=5
STAFF_LOCKOUT_MINUTES=15
```

4. Run `supabase/policies-staff-auth-development.sql`.
5. Run the owner bootstrap without confirmation and verify it refuses to write:

```bash
npm run bootstrap:owner
```

6. Run the confirmed owner bootstrap only when ready:

```bash
npm run bootstrap:owner -- --confirm
```

7. Restart localhost.
8. Open `/staff/login`.
9. Sign in with the temporary Owner PIN.
10. Change PIN.
11. Verify `/staff`.
12. Open `/admin/staff`.
13. Create one test employee.
14. Test incorrect PIN attempts.
15. Test lockout.
16. Unlock employee.
17. Reset PIN.
18. Confirm old sessions are revoked.
19. Archive employee.
20. Confirm the historical record remains.
21. Reactivate the employee and require a new PIN.

Warnings:

- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only and must never be exposed to browser code.
- Staff PIN hashes, session token hashes, and detailed auth events must not be readable by anonymous clients.
- Real customer, staff, financial, and address data must not be protected by unrestricted anon development policies in production.
- Complete `/admin/*` route protection is reserved for Phase 10.3; Phase 10.2 protects `/admin/staff` and `/staff`.

## Phase 10.4 Employee Scheduling

Manual activation order:

1. Run `supabase/migrations/phase-10-4-employee-scheduling.sql`.
2. Run `supabase/policies-staff-scheduling-development.sql`.
3. Restart localhost.
4. Open Admin Scheduling at `/admin/scheduling`.
5. Create a draft schedule.
6. Add shifts.
7. Test conflict protection.
8. Publish the schedule.
9. Login as an employee.
10. View own schedule at `/staff/schedule`.
11. Submit a time-off request at `/staff/time-off`.
12. Approve the request from `/admin/scheduling/time-off`.
13. Confirm the approved time off blocks new scheduling.
14. Copy previous week when the duplicate workflow is ready for operational use.
15. Print the schedule from the weekly schedule view.

Final Phase 10.4 verification:

1. Edit employee name or display name.
2. Confirm Employee Number remains unchanged.
3. Confirm profile update audit event exists.
4. Save staff availability.
5. Reload and verify availability persistence.
6. Create a shift inside availability.
7. Attempt a shift outside availability.
8. Submit a time-off request.
9. Approve the request.
10. Confirm a conflicting shift is blocked.
11. Publish the schedule.
12. View employee schedule from the Staff Portal.
13. Print the schedule.
14. Verify permissions for Owner, Manager, and limited staff roles.
15. Verify archived staff cannot login.

Warnings:

- Scheduling data is sensitive employee information.
- Development scheduling policies are not production RLS.
- Time clock, overtime, payroll, PTO balances, and notifications are not included in Phase 10.4.

## Phase 10.4D Executive Leadership

Manual activation:

1. Review `docs/executive-governance.md`.
2. Run `supabase/migrations/phase-10-4d-executive-leadership.sql`.
3. Manually review staff records before assigning:
   - `0001` Eduardo Gomez: business title `Owner`, security role `owner`.
   - `0002` Felix Aleman: business title `Managing Partner`, security role
     `managing_partner`.
4. Confirm Managing Partner operational permissions.
5. Confirm Owner-only governance permissions remain reserved.

Warnings:

- Do not update employee numbers.
- Do not execute staff record updates automatically from application code.
- Reserved ownership permissions do not expose UI yet.

## Phase 10.5 Timekeeper, Attendance & Timecards

Manual activation:

1. Review `docs/phase-10-5-timekeeper.md`.
2. Review `docs/timekeeper-operating-rules.md`.
3. Run `supabase/migrations/phase-10-5-timekeeper.sql`.
4. Run `supabase/policies-timekeeper-development.sql`.
5. Restart localhost.
6. Login as an employee and open `/staff/timekeeper`.
7. Test clock in, break start, break end, and clock out.
8. Open `/admin/timekeeper`.
9. Review the timecard.
10. Add a missed punch only when testing manual corrections.
11. Approve, reopen, resolve, or dismiss exceptions as appropriate.
12. Open Payroll PDF from `/admin/timekeeper/[id]`.
13. Confirm employee number and business title.
14. Confirm Total Hours Worked.
15. Confirm Regular Hours.
16. Confirm Overtime Hours.
17. Confirm break totals are not printed.
18. Confirm the Exceptions section is absent.
19. Confirm Punch Timeline remains.
20. Confirm Approval section remains.
21. Save the PDF.
22. Print the PDF from the browser PDF viewer.

Warnings:

- Development Timekeeper policies are not production RLS.
- This phase does not process payroll, wages, taxes, deductions, or paychecks.

## Phase 11 Payroll & Pay Period Foundation

Manual setup:

1. Review `docs/phase-11-payroll.md`.
2. Run `supabase/migrations/phase-11-payroll-foundation.sql`.
3. Restart localhost.
4. Open `/admin/payroll`.

Expected result:

- Payroll periods are available when the migration has been run.
- The Payroll dashboard aggregates approved Timekeeper timecards by employee.
- Generate Payroll, Export CSV, and Export Excel remain placeholders.

Warnings:

- This phase does not calculate taxes, pay rates, deductions, paychecks, or accounting exports.
- Do not treat payroll exports as production-ready until a later payroll export phase is completed.

## Phase 11.1 Payroll Actions, Export, and Package Foundation

Manual activation:

1. Review `docs/phase-11-1-payroll-actions.md`.
2. Run `supabase/migrations/phase-11-1-payroll-actions.sql`.
3. Run `supabase/migrations/phase-11-1b-payroll-period-form.sql`.
4. Restart localhost.
5. Open `/admin/payroll`.
6. Open `/admin/payroll/new`.
7. Create a draft payroll period.
8. Confirm the app navigates to `/admin/payroll/[id]`.
9. Generate Payroll.
10. Verify employee payroll rows.
11. Review employee payroll.
12. Approve employee payroll.
13. Approve period.
14. Export CSV.
15. Export Excel.
16. Open Period PDF.
17. Generate Payroll Package.
18. Close period.
19. Reopen with a reason when testing reopen behavior.
20. Verify `payroll_events` and `audit_logs`.

Expected result:

- Payroll rows are generated from approved Timekeeper timecards.
- Source timecards and punches remain unchanged.
- Exports download without UUIDs, exceptions, breaks, PINs, or session data.
- Closed periods block payroll mutation actions.

Warnings:

- This phase still does not calculate wages, taxes, deductions, payments, paychecks, PTO balances, or payroll provider transmissions.
- Do not use unrestricted development policies in production.
- Do not create punches or timecards automatically from SQL.
- Do not use biometric, facial-recognition, or GPS surveillance workflows.

## Phase 11.2 Global User Experience

Manual activation:

1. Review `docs/phase-11-2-global-user-experience.md`.
2. Restart localhost after pulling the UI changes.
3. Open `/admin`.
4. Open `/staff`.
5. Confirm the shared user menu signs out through the staff login route.

Expected result:

- Admin pages show breadcrumbs, notifications foundation, and the authenticated staff menu.
- Staff Operations uses the same Sign Out flow without a duplicate logout button.
- Dashboard quick actions appear only when the current staff member has permission.

Warnings:

- No SQL is required for Phase 11.2.
- Notifications are UI foundation only and do not create persisted records.
- Account Settings and Activity Log remain unavailable until future pages are implemented.

## Launch Readiness Phase F / F.1 / F.2 / F.3 Server-Side Mutation Migration

Manual review:

1. Review `docs/launch-readiness-phase-e-supabase.md`.
2. Review `docs/launch-readiness-phase-f-server-actions.md`.
3. Review `docs/launch-readiness-phase-f1-orders-customers.md`.
4. Review `docs/launch-readiness-phase-f2-returns-shipping.md`.
5. Review `docs/launch-readiness-phase-f3-pos.md`.
6. Confirm no SQL is required for Phase F, F.1, F.2, or F.3.
7. Confirm Product, Media, Inventory, Orders, Customers, Returns, Shipping, Shipping Origins, and POS admin writes use Server Actions.

Expected result:

- Admin Product writes run behind staff permission checks.
- Admin Media uploads run behind staff permission checks.
- Admin Inventory writes run behind staff permission checks.
- Admin Orders writes run behind staff permission checks.
- Admin Customers writes run behind staff permission checks.
- Admin Returns writes run behind staff permission checks.
- Admin Shipping writes run behind staff permission checks.
- Admin Shipping Origin writes run behind staff permission checks.
- Admin POS sale completion writes run behind staff permission checks.

Warnings:

- Review legacy media upload helpers and admin read-path RLS compatibility before applying all Phase E production RLS migrations.
- No Supabase migration should be executed for Phase F/F.1/F.2/F.3.
- Returns and Shipping are server-side after Phase F.2, but still require future transactional RPC/database designs for multi-step completion and shipment creation flows.
- POS is server-side after Phase F.3, but still requires a future transactional RPC/database design because it touches orders, order items, payments, receipts, inventory, and ledger rows.

## Launch Readiness Phase F.4 Transactional Database Hardening

Manual review only:

1. Review `docs/launch-readiness-phase-f4-transactional-hardening.md`.
2. Review `supabase/migrations/phase-f4-transactional-hardening.sql`.
3. Confirm the migration has not been executed.
4. Confirm Server Actions still use the existing sequential paths until manual activation.

Future activation order:

1. Backup Supabase.
2. Review the migration.
3. Run transaction migration in development.
4. Verify functions exist.
5. Switch POS Server Action to RPC.
6. Test POS sale.
7. Switch Return Server Action to RPC.
8. Test return completion/restock.
9. Switch Shipping Server Action to RPC.
10. Test shipment finalization.
11. Verify rollback scenarios.
12. Verify audit/event rows.
13. Run lint/build.
14. Apply production RLS hardening only after all active writes are server/RPC safe.

Warnings:

- Do not execute `supabase/migrations/phase-f4-transactional-hardening.sql` from the application.
- The functions are prepared for review only and are not active until manually applied and wired.
- Do not claim POS, Returns, or Shipping are transaction-safe until RPC integration and rollback tests pass.

## Launch Readiness Phase F.4A RPC Activation Checkpoint

Status:

- Blocked before SQL execution.

Reason:

- No safe development database backup/export checkpoint was confirmed from local project context.

Manual next step:

1. Create or confirm a development Supabase backup/export checkpoint.
2. Review `docs/launch-readiness-phase-f4a-rpc-activation.md`.
3. Review `supabase/migrations/phase-f4-transactional-hardening.sql`.
4. Execute the migration manually against development only.
5. Confirm the functions and grants exist.
6. Resume RPC adapter and Server Action integration only after successful confirmation.

## 4. Rollback Notes

- This execution is for development only.
- If needed, drop tables in reverse dependency order.
- Never drop production data without a verified backup.
- Take a Supabase backup before any future production migration.

## 5. Next Phases After Execution

- Phase 5.1: Read brands from Supabase.
- Phase 5.2: Read catalog taxonomies.
- Phase 5.3: Read products.
- Phase 5.4: Save Product Studio to Supabase.
- Phase 5.5: POS order writes.
- Phase 5.6: Inventory transaction writes.
- Phase 5.7: Supabase Storage for media.
