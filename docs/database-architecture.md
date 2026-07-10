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

## Phase Migration Plan

1. Keep `lib/products.ts` active.
2. Create the Supabase schema.
3. Seed brands, categories, traditions, product types, collections, products, media, and inventory.
4. Read products from the database while keeping a fallback to the local seed catalog during transition.
5. Save Product Studio edits to the database.
6. Connect POS orders, payments, receipts, and inventory transactions.
7. Connect media storage and replace local static media scanning with managed assets.

Until those phases are implemented, Product Studio, POS, Product Wizard, and storefront product previews continue using the local seed catalog and browser-local overrides.
