# ASHE TOKUN Database Architecture

This document defines the long-term database direction for ASHE TOKUN before live Supabase data replaces the local catalog foundation.

## Store, Brands, Suppliers, Products

ASHE TOKUN is the store and retailer. It is the customer-facing place where products are merchandised, sold, receipted, and fulfilled.

Brands are customer-facing product brands sold inside ASHE TOKUN. The first two official brands are AJAKO ORIGINALS and ODIBERE CREATIONS. Product pages, POS receipts, and merchandising can show the product brand while the transaction remains an ASHE TOKUN sale.

Suppliers are optional operational sources. A supplier can be a manufacturer, artisan partner, wholesaler, or fulfillment source. Suppliers are not always customer-facing, and some products may not need a supplier record at all.

A product is a sellable item. Every product references `brand_id` because the customer should be able to understand who made or branded the item. A product may optionally reference `supplier_id` when operational purchasing, receiving, or vendor tracking becomes useful.

## Why Products Reference `brand_id`

The earlier local model used `vendor` for both customer-facing brand and operational source. The database separates those ideas:

- `brand_id` powers storefront merchandising, product detail pages, product cards, POS item lines, and receipts.
- `supplier_id` supports purchase orders, receiving, vendor costs, and internal operations.

This lets ASHE TOKUN remain the store while still presenting brands such as AJAKO ORIGINALS and ODIBERE CREATIONS clearly.

## Shared Inventory for POS and Online Store

Inventory is modeled around `inventory_locations`, `inventory_items`, and `inventory_transactions`.

`inventory_locations` supports Main Stockroom, AJAKO Studio, ODIBERE Beadwork, and future store, studio, or partner locations.

`inventory_items` stores product quantity per location. This allows one product to have stock in multiple places.

`inventory_transactions` records movement and adjustments using transaction types:

- sale
- return
- adjustment
- receiving
- transfer

The POS and online store should eventually read from the same inventory layer. A POS sale and an online order will both create order records, payment records, receipt records when needed, and inventory transactions after the sale is finalized.

## Receipts and Product Brands

Receipts remain ASHE TOKUN receipts because ASHE TOKUN is the retailer and seller of record.

Receipt and order item lines can store product name, SKU, barcode, brand name, and price at the time of sale. This keeps historical receipts stable even if product names, brands, or prices change later.

In practice:

- Receipt header: ASHE TOKUN
- Item line: product name, brand/vendor display, SKU, quantity, unit price, line total
- Payment summary: cash, card, Zelle, other, or split payment

## Domain Map

Core Catalog:

- brands
- suppliers
- categories
- collections
- traditions
- product_types
- products
- product_collections
- product_media

Media:

- media_assets
- media_usage

Inventory:

- inventory_locations
- inventory_items
- inventory_transactions

Sales / POS / Orders:

- customers
- orders
- order_items
- payments
- receipts

Operations / Future:

- discounts
- tax_rates
- gift_cards
- returns
- purchase_orders
- purchase_order_items

Admin / Security / Audit:

- staff_users
- roles
- audit_logs

## Core Catalog Domain

Phase 4.2 defines the first production-ready database domain for ASHE TOKUN: Core Catalog.

Core Catalog is responsible for customer-facing product structure before inventory, media, POS, orders, or Product Studio writes are connected. The local catalog remains active until a later migration phase turns on database reads.

Relationships:

- `brands` stores customer-facing product brands sold inside ASHE TOKUN, such as AJAKO ORIGINALS and ODIBERE CREATIONS.
- `categories` stores product category taxonomy and supports nested categories through `parent_category_id`.
- `collections` stores merchandising groupings such as New Arrivals, Best Sellers, AJAKO Originals, and ODIBERE Creations.
- `traditions` stores tradition-based grouping such as Ifá, Orisha, Abakuá, Palo, Espiritismo, and Christian.
- `product_types` stores commerce handling types such as Physical Product, Handmade Product, and Made to Order.
- `products` stores sellable catalog items. Each product belongs to one brand, one category, and one product type. A product may optionally belong to one tradition.
- `product_collections` connects products to many collections.

Supplier support is intentionally deferred. The `products.supplier_id` field is present as a nullable UUID for forward compatibility, but a supplier table and foreign key will be introduced in a later supplier/operations phase.

ER-style text diagram:

```text
brands
  └── products.brand_id

categories
  ├── categories.parent_category_id
  └── products.category_id

traditions
  └── products.tradition_id

product_types
  └── products.product_type_id

products
  └── product_collections.product_id

collections
  └── product_collections.collection_id
```

Core Catalog migration intent:

1. Create Core Catalog tables.
2. Seed brands first.
3. Seed categories, collections, traditions, and product types.
4. Seed products from the approved local catalog.
5. Map products into collections.
6. Keep storefront, POS, Product Studio, Inventory, and Media Library using local data until database reads are explicitly enabled.

## Inventory Domain

Phase 4.3 defines the production-ready Inventory Domain architecture for ASHE TOKUN.

Inventory is transaction based. The system should never rely on a single stock number stored directly on the product as the source of truth. Instead, stock is represented by inventory records per product and location, and every change is explained by the inventory ledger.

Core inventory concepts:

- `inventory_locations` stores physical and operational locations such as Main Stockroom, Retail Floor, AJAKO Studio, ODIBERE Workshop, and future warehouses.
- `inventory_items` stores a product balance at a specific location.
- `inventory_transactions` is the inventory ledger. It records sales, returns, receiving, adjustments, transfers, damage, loss, cycle counts, and opening balances.

Current quantity is derived from inventory records:

- `on_hand_quantity` is the quantity physically or operationally present.
- `reserved_quantity` is inventory held for pending orders or future allocation.
- `available_quantity` represents `on_hand_quantity - reserved_quantity`.
- `incoming_quantity` tracks expected stock.
- `inventory_value` is informational and supports reporting and valuation.

Inventory supports multiple locations and future warehouses. The same product can exist in the Retail Floor, Main Stockroom, AJAKO Studio, ODIBERE Workshop, and future locations. This keeps the physical store and online store aligned around the same inventory model.

POS and online sales should use the same inventory. A future POS sale or online order will create an inventory transaction with a sale reference. Returns, manual adjustments, transfers, receiving, and damage/loss events will also create ledger entries, preserving full inventory history.

Inventory Ledger concept:

```text
products
  └── inventory_items.product_id

inventory_locations
  └── inventory_items.location_id

inventory_items
  └── inventory_transactions.inventory_item_id

inventory_transactions
  ├── transaction_type: sale | return | receiving | adjustment | transfer_in | transfer_out | damage | loss | cycle_count | opening_balance
  └── reference_type: POS | Online Order | Purchase Order | Manual Adjustment | Inventory Transfer | Customer Return
```

## Sales Domain

Phase 4.4 defines the production-ready Sales Domain architecture for ASHE TOKUN.

The Sales Domain supports physical POS, website orders, manual orders, phone orders, future marketplace integrations, and a future mobile app. It is designed to keep ASHE TOKUN as the seller of record while preserving product and brand details at the moment of sale.

Core sales concepts:

- `customers` stores walk-in, registered, wholesale, and VIP customers. Walk-in sales can use the default Walk-in Customer record.
- `customer_addresses` stores shipping, billing, and account addresses for future website, phone, and registered customer flows.
- `orders` stores the sale header, including channel, status, payment status, totals, and customer relationship.
- `order_items` stores each sold item and snapshots product name, brand name, SKU, unit price, discount, tax, and line total.
- `payments` stores payment records. Multiple rows per order allow split payments.
- `receipts` stores ASHE TOKUN receipt records with receipt numbers, printed state, and emailed state.

Sales Channels:

- POS
- Website
- Manual
- Phone
- Marketplace
- Mobile

Historical snapshots are intentional. `order_items.product_name` and `order_items.brand_name` should not be replaced by live joins in receipt history. If a product name, brand name, or catalog price changes later, historical order lines remain accurate to what was sold.

Split payments are modeled as multiple payment records tied to one order. A single sale can have cash, card, Zelle, other, or future split-payment records without changing the order model.

Walk-in customer model:

```text
customers
  └── orders.customer_id

orders
  ├── order_items.order_id
  ├── payments.order_id
  └── receipts.order_id

products
  └── order_items.product_id
```

The default Walk-in Customer gives POS a stable customer reference for anonymous physical store sales while preserving the ability to add registered customers later.

## Media Domain

Phase 4.5 defines the production-ready Media Domain architecture for ASHE TOKUN.

The Media Domain powers the Digital Asset Manager. It must support commerce assets and future production assets in the same asset management system while keeping their purpose clear through asset types and usage tracking.

Commerce assets include:

- Product photos
- Gallery images
- Thumbnails
- Brand logos
- Marketing banners
- Icons
- Homepage and campaign images

Production assets include:

- SVG
- STL
- 3MF
- Fusion 360 files
- LightBurn projects
- Laser templates
- Assembly manuals
- Certificates
- PDF documentation

Core media concepts:

- `media_assets` stores the actual digital asset metadata: filename, original filename, storage path, public URL, asset type, MIME type, extension, dimensions, duration, brand relationship, and active state.
- `product_media` connects products to media assets. A product can have many media assets, and the `is_primary` flag identifies the main product image.
- `media_usage` tracks where assets are used across products, collections, brands, homepage areas, banners, marketing, production, and documentation.

Primary Image concept:

A product can have many media assets, but only one primary image. The database enforces this with a partial unique index on `product_media(product_id)` where `is_primary = true`.

Media usage tracking lets the same file be reused safely. For example, a brand logo can appear on a brand record and in marketing, while a production SVG can be attached to a product and tracked as a manufacturing file.

Commerce media flow:

```text
Media Assets
  ↓
Product Media
  ↓
Products
  ↓
Commerce
```

Production media flow:

```text
Media Assets
  ↓
Production Files
  ↓
Manufacturing
```

The Digital Asset Manager should eventually filter by asset type, usage, brand, product, and production purpose without splitting commerce and production files into disconnected systems.

## Operations Domain

Phase 4.6 defines the production-ready Operations Domain architecture for ASHE TOKUN.

Operations supports the business side of ASHE TOKUN beyond selling products. It covers the workflows needed to buy, receive, return, discount, tax, consign, pay out, and audit business activity.

Core operations concepts:

- `suppliers` stores operational vendors, sources, and artisan partners.
- `purchase_orders` and `purchase_order_items` support ordering products or supplies from suppliers.
- `receiving_records` and `receiving_record_items` support receiving goods into inventory locations.
- `returns` and `return_items` support refunds, exchanges, and store credit workflows.
- `discounts` supports amount and percent discounts.
- `tax_rates` stores tax configuration such as the Florida Sales Tax Placeholder.
- `gift_cards` supports future gift card balances and lifecycle status.
- `consignment_accounts` and `consignment_items` support consigned items, ownership tracking, commission rates, and payout status.
- `vendor_payouts` supports payouts to suppliers, brands, or consignment accounts.
- `staff_users` provides staff placeholders before authentication is connected.
- `audit_logs` records staff/system actions and entity changes.

Operations relationship sketch:

```text
suppliers
  ├── purchase_orders.supplier_id
  ├── receiving_records.supplier_id
  ├── consignment_accounts.supplier_id
  └── vendor_payouts.supplier_id

purchase_orders
  ├── purchase_order_items.purchase_order_id
  └── receiving_records.purchase_order_id

receiving_records
  └── receiving_record_items.receiving_record_id

orders
  └── returns.order_id

returns
  └── return_items.return_id

consignment_accounts
  ├── consignment_items.consignment_account_id
  └── vendor_payouts.consignment_account_id

staff_users
  └── audit_logs.staff_user_id
```

Operations is intentionally separate from POS behavior for now. The current app continues to use local data until future phases explicitly connect purchase orders, receiving, returns, discounts, taxes, gift cards, consignment, payouts, staff users, and audit logging.

## Phase Migration Plan

1. Keep `lib/products.ts` active.
2. Create the Supabase schema.
3. Seed brands, categories, traditions, product types, collections, products, media, and inventory.
4. Read products from the database while keeping a fallback to the local seed catalog during transition.
5. Save Product Studio edits to the database.
6. Connect POS orders, payments, receipts, and inventory transactions.
7. Connect media storage and replace local static media scanning with managed assets.

Until those phases are implemented, Product Studio, POS, Product Wizard, and storefront product previews continue using the local seed catalog and browser-local overrides.
