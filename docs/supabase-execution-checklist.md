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
  - ODIBERE CREATIONS
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
    odibere-creations/
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
