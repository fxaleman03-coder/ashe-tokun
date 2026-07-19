# Phase 16A - Product Identification and Barcode Creator

## Scope

Phase 16A prepares ASHE TOKUN internal product identification and printable
Code 128 barcode labels. It preserves Phase 15 POS, inventory, receipt, and
transaction behavior.

The Phase 16A barcode UI has been deployed. The Product Identification panel is
visible in Product Edit, and Shelf, Product, and Mini label previews are
available from individual product and bulk label flows.

No production data was modified by this implementation step. The migration was
created but remains local-only and unapplied.

## Current Transitional Risk

The deployed product-creation flow no longer submits the legacy
`products.barcode` value because new internal barcode values are intended to be
assigned by the Phase 16A database trigger. Until the Phase 16A migration is
applied, production may still have `products.barcode` as a required `NOT NULL`
column. New product creation may therefore fail before migration execution or
before a temporary compatibility fallback is restored.

## Database Foundation

Prepared migration:

- `supabase/migrations/20260718010000_phase_16a_product_identification.sql`

Columns added to `public.products`:

- `barcode_value text`
- `barcode_format text not null default 'CODE128'`
- `barcode_generated_at timestamptz`
- `barcode_print_count integer not null default 0`
- `barcode_last_printed_at timestamptz`

Constraints prepared:

- `barcode_format = 'CODE128'`
- `barcode_print_count >= 0`
- `barcode_value` must satisfy the internal Code 128 value policy
- unique `barcode_value`
- `barcode_value not null` after backfill

## Existing Product Backfill

Existing products preserve current `products.sku`.

Existing products preserve current legacy `products.barcode`.

Backfill behavior:

1. If `products.barcode` is nonempty, unique, uppercase, and valid for the
   internal Code 128 policy, `barcode_value` is set from the existing barcode.
2. Missing, invalid, or conflicting values receive a generated internal value.
3. Generated values use the sequence-backed format:
   - `AT-P-00000001`
   - `AT-P-00000002`
4. Generated values are not based on product name, category, supplier, or any
   mutable business field.

These are internal ASHE TOKUN identifiers only. They are not UPC, EAN, or GTIN
values.

## New Product Generation

The migration creates:

- `public.product_barcode_value_seq`
- `public.generate_product_barcode_value()`
- `public.set_product_internal_barcode()`

The trigger assigns `barcode_value` before insert when absent and does not
regenerate it during ordinary updates. Product creation no longer assigns the
legacy barcode from the client-side preview SKU.

The transition keeps `products.barcode` for compatibility. If a new insert omits
legacy `barcode`, the trigger fills it from the generated internal barcode so
the existing not-null legacy column remains compatible.

## Scanner Lookup

Scanner-ready lookup now resolves exact matches in this order:

1. `barcode_value`
2. legacy `barcode`
3. `sku`

The POS transaction flow itself was not changed.

## Code 128 Generator

Created:

- `lib/barcodes/code128.ts`
- `lib/barcodes/code128TestCases.ts`

The generator:

- implements Code 128 Code Set B
- calculates checksum
- validates printable ASCII input
- escapes SVG-visible text
- returns printable SVG
- does not use canvas
- does not add a dependency

Deterministic checksum cases:

- `A` -> checksum `34`
- `ASHE` -> checksum `95`
- `123456` -> checksum `16`
- `AT-P-00000001` -> checksum `15`

## Label Architecture

Created:

- `components/admin/ProductBarcodeLabel.tsx`
- `components/admin/ProductBarcodePrintSheet.tsx`

Supported label modes:

- `SHELF`: product name, price, Code 128, human-readable barcode value, SKU
- `PRODUCT`: Code 128, human-readable barcode value, SKU
- `MINI_PRODUCT`: Code 128 and human-readable barcode value

Shipping labels are intentionally out of scope.

Current Brother HL-L2370DW Letter-sheet profiles:

- Shelf: `4in x 2in`, 2 columns x 5 rows, 10 labels per Letter sheet
- Product: `2in x 1in`, 4 columns x 10 rows, 40 labels per Letter sheet
- Mini: `2in x 0.5in`, 4 columns x 21 rows, 84 labels per Letter sheet

Browser printing uses US Letter and fixed physical CSS units. Screen preview may
scroll or scale within the modal, but print sizing remains inch-based for
label-sheet alignment.

Print count behavior:

- print counts update only through an explicit Print Labels action
- updates use a server action and service-role RPC
- batch payloads increment counts by actual requested label quantity
- printing does not alter inventory or product commercial data
- before the migration is applied, the missing print-count RPC is handled as a
  non-blocking warning so browser printing can continue

## Rollback Considerations

Before applying this migration, review any dependent deployment order. The app
should not rely on `barcode_value` in production until the migration has been
applied.

Rollback plan if needed before dependent UI activation:

1. Remove product barcode trigger.
2. Drop product barcode print tracking function.
3. Drop generator function.
4. Drop unique index and constraints.
5. Drop barcode metadata columns.
6. Drop sequence if no longer needed.

Do not drop legacy `products.barcode`.

## Verification

- Code 128 deterministic test cases: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.

## Production Safety

No remote SQL execution was performed for the Phase 16A migration.

No migration was applied.

No production data was changed.

The Phase 16A barcode UI was deployed separately from the database migration.
