# ASHE TOKUN Business Data Model Review

Phase 3.3 reviews the business model before any Supabase schema is applied. The purpose is to confirm the language and ownership rules that will guide the database, POS, inventory, receipts, and future storefront integrations.

## 1. Business Model

ASHE TOKUN is the store and retailer. It is the business that presents products, sells to customers, owns the checkout experience, and issues receipts.

AJAKO ORIGINALS is a brand sold inside ASHE TOKUN. It is the in-house brand for original handcrafted spiritual goods.

ODIBERE CREATIONS is a brand sold inside ASHE TOKUN. It is the artisan partner brand for handcrafted beadwork and related products.

Future brands and artisans can be added without changing the store identity. The store remains ASHE TOKUN, while products can carry their own customer-facing brand.

## 2. Core Concepts

Store:
The retailer and seller of record. For this project, the store is ASHE TOKUN.

Brand:
The customer-facing product brand. Examples include AJAKO ORIGINALS and ODIBERE CREATIONS. Product pages, product cards, and receipts can show the brand.

Supplier:
An operational source for purchasing, receiving, consignment, or vendor management. Suppliers may or may not be customer-facing.

Manufacturer / Maker:
The person, studio, artisan, or business that physically makes a product. In the first schema, this may be represented through brand or supplier. A dedicated `maker_id` can be added later if the business needs artisan-level attribution.

Product:
A sellable item in ASHE TOKUN. Products should reference `brand_id` and may optionally reference `supplier_id` or a future `maker_id`.

Inventory Item:
A product quantity at a specific inventory location. This allows the same product to exist in Main Stockroom, AJAKO Studio, ODIBERE Beadwork, and future locations.

Order:
A sale record created through POS, online checkout, manual entry, or future channels.

Receipt:
The customer-facing proof of sale. Receipts belong to ASHE TOKUN, even when item lines display a product brand.

Customer:
The person or account buying from ASHE TOKUN. The model must support walk-in customers and registered customers.

## 3. Key Decisions

- Receipts belong to ASHE TOKUN, not individual brands.
- Product lines may display brand/vendor for customer clarity.
- Products reference `brand_id`.
- Products may optionally reference `supplier_id` or a future `maker_id`.
- Inventory must support POS and online store together.
- Orders must support POS, online, manual, and future channels.

## 4. Future Business Cases To Support

- Multiple brands
- Multiple inventory locations
- Walk-in customers
- Registered customers
- Returns
- Exchanges
- Discounts
- Tax rates
- Split payments
- Consignment items
- Purchase orders
- Vendor payouts
- Physical store sales
- Online sales
- Future marketplace expansion

## 5. Risks To Avoid

- Hardcoding AJAKO as the whole store.
- Treating ODIBERE as only a category.
- Putting manufacturing files inside the ASHE TOKUN commerce product.
- Duplicating vendor names as text everywhere.
- Building POS inventory separate from online inventory.

## 6. Approval Checklist

- [ ] Store identity confirmed
- [ ] Brand model confirmed
- [ ] Supplier model deferred
- [ ] Inventory sharing confirmed
- [ ] Receipt ownership confirmed
- [ ] POS + online unified inventory confirmed
- [ ] Local catalog migration path confirmed

## 7. Migration Strategy

1. Keep local catalog active now.
2. Use Supabase schema as the next backend layer.
3. Seed brands first.
4. Seed catalog taxonomies.
5. Seed products.
6. Connect read operations.
7. Connect Product Studio save.
8. Connect POS order creation.
9. Connect inventory transactions.

This review should be approved before applying the schema so the database reflects the real business structure instead of a temporary implementation shortcut.
