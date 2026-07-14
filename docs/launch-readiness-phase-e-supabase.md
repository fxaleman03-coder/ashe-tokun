# Launch Readiness Phase E: Supabase Production Hardening

Date: July 14, 2026

Scope: Supabase client usage, repository boundaries, RLS policy posture, storage access, service-role usage, and production hardening recommendations.

No SQL was executed. No migrations were applied. No data was modified.

## Current Architecture

ASHE TOKUN currently uses a hybrid Supabase model:

- Public storefront reads use the publishable/anon client and RLS-filtered active catalog policies.
- Staff authentication uses custom HTTP-only staff session cookies, not Supabase Auth sessions.
- Staff, payroll, scheduling, and timekeeper server modules increasingly use the service-role client behind server boundaries.
- Several older operational modules still perform browser-side writes with the anon client and depend on broad development RLS policies.
- Supabase Storage uses a public `product-media` bucket for storefront image reads, with development anon upload/update/delete policies still present in policy files.

This architecture is workable for development but is not production-ready until development anon policies are removed and privileged write paths are moved behind server-side permission checks.

## Client Inventory

| Client | File | Used By | Appropriateness | Risk |
| --- | --- | --- | --- | --- |
| Shared anon client | `lib/supabase.ts` | Catalog repositories, media repository, older operational repositories and mutations | Appropriate for public reads only | High when used by browser write mutations |
| Browser anon client factory | `lib/supabase/client.ts` | Browser-side client creation helper | Appropriate for non-sensitive reads | Medium |
| Server anon client factory | `lib/supabase/server.ts` | Server-side anon reads | Appropriate for public RLS-filtered reads | Low |
| Service-role client | `lib/supabase/service.ts` | Staff, scheduling, timekeeper, payroll, permission guard | Appropriate for server-only custom staff-auth architecture | Medium due to broad privilege, but protected with `server-only` |
| Script service client | `scripts/bootstrap-owner.ts` | Owner bootstrap CLI | Appropriate standalone server script usage | Low if `.env.local` stays local |
| Migration script anon clients | `scripts/migrate-products-to-supabase.ts`, `scripts/migrate-product-inventory-to-supabase.ts`, `scripts/migrate-media-to-supabase.ts` | Development migrations | Development only | Medium if reused after production hardening |

## Repository Inventory

| Area | Representative Files | Current Client | Finding |
| --- | --- | --- | --- |
| Products/catalog | `productsRepository.ts`, `brands.ts`, `categories.ts`, `collections.ts`, `productTypes.ts`, `traditions.ts` | anon | Acceptable for public active storefront/reference reads. Product writes should not use anon in production. |
| Media | `mediaRepository.ts`, `productMediaRepository.ts`, `mediaStorage.ts` | anon | Reads are acceptable for public media. Upload/link/delete operations should move to server-side staff-checked actions before production. |
| Product mutations | `productMutations.ts`, `productMediaMutations.ts` | browser anon | Production blocker. Product edits, creates, and media links should move server-side. |
| Inventory | `inventoryRepository.ts`, `inventoryMutations.ts` | anon | Reads/writes expose operational stock under dev policies. Writes must move server-side. |
| POS | `posRepository.ts`, `posMutations.ts` | anon | Production blocker. Orders, payments, receipts, and inventory decrements must be server-side atomic operations. |
| Orders | `ordersRepository.ts`, `orderMutations.ts` | anon | Management reads/writes currently rely on dev anon policies. Move writes server-side. |
| Customers | `customersRepository.ts`, `customerMutations.ts` | anon | Production blocker. Customer PII must not be readable/writable by anon clients. |
| Returns | `returnsRepository.ts`, `returnMutations.ts` | anon | Production blocker. Refund/store-credit flows must be server-side with permission checks. |
| Shipping | `shippingRepository.ts`, `shippingMutations.ts`, `shippingOriginsRepository.ts`, `shippingOriginMutations.ts` | anon | Production blocker for shipment/customer address data and origin management. |
| Staff | `staffRepository.ts`, `staffActions.ts`, `staffAuthService.ts` | service role | Correct direction. Keep server-only, permission-checked. |
| Scheduling | `schedulingRepository.ts`, `schedulingMutations.ts` | repository falls back to service role; mutations service role | Mostly correct for custom staff-auth. Remove anon fallback for sensitive routes before production. |
| Timekeeper | `timekeeperRepository.ts`, `timekeeperMutations.ts` | service role | Correct direction. Continue permission guarding server actions. |
| Payroll | `payrollRepository.ts`, `payrollMutations.ts`, `lib/payroll/*` | service role | Correct direction. Payroll export/PDF routes are server-side. |

## Policy Inventory

Public/reference read policy files:

- `policies-products-public-read.sql`
- `policies-brands-read.sql`
- `policies-categories-read.sql`
- `policies-collections-read.sql`
- `policies-product-types-read.sql`
- `policies-traditions-read.sql`

Development-only policy files with broad anon access:

- `policies-products-admin-insert.sql`
- `policies-products-admin-update.sql`
- `policies-products-migration-write.sql`
- `policies-media-assets-development.sql`
- `policies-product-media-development.sql`
- `policies-inventory-development.sql`
- `policies-pos-development.sql`
- `policies-orders-management-development.sql`
- `policies-customers-development.sql`
- `policies-returns-development.sql`
- `policies-shipping-development.sql`
- `policies-shipping-origins-development.sql`
- `policies-staff-scheduling-development.sql`
- `policies-timekeeper-development.sql`
- `storage-policy-product-media.sql`

Staff auth deny policies:

- `policies-staff-auth-development.sql`

These deny anon staff-member/session/auth-event access and are safe as defense-in-depth. They are not a complete production staff authorization model by themselves.

## Unsafe Policies

Critical unsafe policy categories:

- Anon customer read/write policies expose sensitive PII.
- Anon POS order/payment/receipt writes allow unauthenticated commerce mutation.
- Anon inventory item/transaction writes allow stock manipulation.
- Anon returns/gift-card policies allow refund and credit manipulation.
- Anon shipment/address policies expose fulfillment and address data.
- Anon scheduling/time-off/timekeeper policies expose sensitive staff records.
- Anon product/media write policies allow unauthorized catalog and media changes.
- Anon storage upload/update/delete policies allow public writes to `product-media`.

## Migration Plan

Generated but not executed:

- `supabase/migrations/phase-e-production-rls.sql`
- `supabase/migrations/phase-e-storage-security.sql`

The production RLS draft:

- Keeps anon access only for active public storefront/reference reads.
- Removes temporary product admin/migration write policies.
- Removes anon operational management policies across customers, orders, POS, inventory, returns, shipping, scheduling, timekeeper, and media relationships.
- Enables RLS on staff, scheduling, timekeeper, payroll, commerce, and catalog tables.
- Leaves sensitive operational tables service-role only until a Supabase Auth/RPC authorization model exists.

The storage hardening draft:

- Keeps `product-media` publicly readable for storefront display.
- Preserves the 20 MB image-only bucket configuration.
- Drops anon upload/update/delete object policies.
- Recreates only public read access for `product-media`.

## Server Action Boundary Audit

Server-side boundaries already in the right direction:

- Staff auth and staff management.
- Permission guard.
- Scheduling mutations.
- Timekeeper mutations.
- Payroll mutations and export/PDF routes.

Mutation flows that should move server-side before production:

- Product creation/edit/linking.
- Media upload/delete and media asset database insert/update.
- Inventory adjustments and transfers.
- POS sale creation, payment insertion, receipt insertion, and inventory decrement.
- Order management updates.
- Customer create/update/address management.
- Returns, refunds, gift-card/store-credit issuance.
- Shipping creation/update/package/event/origin management.

## Service Role Audit

`lib/supabase/service.ts` is protected with `import "server-only"` and uses `SUPABASE_SERVICE_ROLE_KEY` with session persistence disabled.

No direct evidence was found of the service-role helper being imported into client components. The highest-risk area is not exposure of the service key, but the volume of server modules that use service role and must keep permission checks close to each action.

Recommended controls:

- Keep service role imports restricted to server-only modules, route handlers, and CLI scripts.
- Add code-review checks for `createSupabaseServiceClient` imports in files with `"use client"`.
- Avoid returning raw Supabase errors that include internal schema or policy details to browser UI.

## Storage Security

Current posture:

- `product-media` is public, which is acceptable for storefront product images.
- Development policy allows anon upload/update/delete.
- Media asset rows currently have development anon insert/update policies.

Production recommendation:

- Public read for product images only.
- Upload/update/delete through staff-authenticated server actions.
- Keep MIME and size limits at the bucket level.
- Consider private buckets with signed URLs for future documents, certificates, staff files, and payroll artifacts.

## Authentication Boundary

Staff/admin access currently depends on:

- HTTP-only staff session cookie.
- Read-only session validation for render paths.
- Server-side permission guard.
- Service-role backed staff/session queries.

This is acceptable as a custom staff-auth foundation if all privileged writes stay server-side. It is not compatible with unrestricted browser anon write policies in production.

## Data Ownership

Production target rules:

- Employees read their own schedule, availability, time-off, timecards, and punches.
- Managers and executive roles read broader staff operations only through server permission checks.
- Payroll data is restricted to payroll-authorized roles.
- Customer, order, shipping, and return data must be staff-only.
- Inventory mutations must be staff-only and auditable.
- Public anon access should be limited to public catalog/reference/product media reads.

Current gap:

Because the project uses custom staff sessions instead of Supabase Auth JWT claims, table-level per-user RLS cannot yet express staff ownership without additional claim plumbing or RPC boundaries. Until then, sensitive access should be service-role only behind server guards.

## Production Recommendations

1. Move all remaining browser-side operational mutations behind Server Actions or route handlers.
2. Apply `phase-e-production-rls.sql` only after browser anon writes are retired.
3. Apply `phase-e-storage-security.sql` only after media uploads are server-side.
4. Add integration tests for unauthorized anon access to sensitive tables.
5. Add CI search checks preventing service-role imports in client files.
6. Introduce a production RLS model using Supabase Auth custom claims or security-definer RPCs if direct client access is desired later.
7. Keep public storefront RLS narrow: active, online, public catalog data only.

## Remaining Risks

- Broad development anon policies remain in source until the production migrations are reviewed/applied.
- Some repositories still use the anon client for sensitive reads/writes.
- Several mutation modules are browser-side `"use client"` modules.
- Storage upload/delete is currently anon-policy based in development.
- Custom staff sessions provide app-layer authorization but do not map directly to Supabase Auth RLS claims yet.
- Payroll/timekeeper/scheduling service-role access is powerful and depends on rigorous server permission checks.

## Supabase Security Score

Current score: **46 / 100**

Rationale:

- Strong progress: service-role server boundaries for staff, scheduling, timekeeper, and payroll; staff cookies are HTTP-only; public catalog read policies are scoped.
- Major blockers: development anon write policies and browser-side operational mutations still exist for commerce, customer, inventory, returns, shipping, products, and media.

Target score after Phase E migrations and server-side mutation migration: **82 / 100**.
