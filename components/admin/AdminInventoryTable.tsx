"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  InventoryItem,
  InventoryLocation,
  InventorySummary,
} from "@/lib/data/inventoryRepository";

type AdminInventoryTableProps = {
  items: InventoryItem[];
  locations: InventoryLocation[];
  summary: InventorySummary;
};

type StockStatus = "All" | "Ready" | "Low Stock" | "Out of Stock";

function getInventoryStatus(item: InventoryItem): Exclude<StockStatus, "All"> {
  if (item.available_quantity <= 0) {
    return "Out of Stock";
  }

  if (item.available_quantity <= item.reorder_level) {
    return "Low Stock";
  }

  return "Ready";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export default function AdminInventoryTable({
  items,
  locations,
  summary,
}: AdminInventoryTableProps) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [stockStatus, setStockStatus] = useState<StockStatus>("All");

  const brands = useMemo(
    () => unique(items.map((item) => item.product.brand)),
    [items],
  );
  const categories = useMemo(
    () => unique(items.map((item) => item.product.category)),
    [items],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const status = getInventoryStatus(item);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.product.name.toLowerCase().includes(normalizedQuery) ||
        item.product.sku.toLowerCase().includes(normalizedQuery) ||
        item.product.barcode.toLowerCase().includes(normalizedQuery);
      const matchesBrand = brand === "all" || item.product.brand === brand;
      const matchesCategory =
        category === "all" || item.product.category === category;
      const matchesLocation = location === "all" || item.location_id === location;
      const matchesStatus = stockStatus === "All" || status === stockStatus;

      return (
        matchesQuery &&
        matchesBrand &&
        matchesCategory &&
        matchesLocation &&
        matchesStatus
      );
    });
  }, [brand, category, items, location, query, stockStatus]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Inventory Items", summary.totalInventoryItems],
          ["Total On Hand", summary.totalOnHand],
          ["Total Available", summary.totalAvailable],
          ["Reserved", summary.reserved],
          ["Incoming", summary.incoming],
          ["Low Stock", summary.lowStock],
          ["Out of Stock", summary.outOfStock],
          ["Inventory Value", formatCurrency(summary.inventoryValue)],
        ].map(([label, value]) => (
          <article
            key={label}
            className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
          >
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search product, SKU, or barcode"
          className="min-h-12 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70"
        />
        <select
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          className="min-h-12 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
        >
          <option value="all">Brand</option>
          {brands.map((brandName) => (
            <option key={brandName} value={brandName}>
              {brandName}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-12 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
        >
          <option value="all">Category</option>
          {categories.map((categoryName) => (
            <option key={categoryName} value={categoryName}>
              {categoryName}
            </option>
          ))}
        </select>
        <select
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="min-h-12 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
        >
          <option value="all">Location</option>
          {locations.map((inventoryLocation) => (
            <option key={inventoryLocation.id} value={inventoryLocation.id}>
              {inventoryLocation.name}
            </option>
          ))}
        </select>
        <select
          value={stockStatus}
          onChange={(event) => setStockStatus(event.target.value as StockStatus)}
          className="min-h-12 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
        >
          {["All", "Ready", "Low Stock", "Out of Stock"].map((status) => (
            <option key={status} value={status}>
              {status === "All" ? "Stock Status" : status}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[1500px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">Image</th>
              <th className="px-5 py-4">SKU</th>
              <th className="px-5 py-4">Barcode</th>
              <th className="px-5 py-4">Brand</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">On Hand</th>
              <th className="px-5 py-4">Reserved</th>
              <th className="px-5 py-4">Available</th>
              <th className="px-5 py-4">Incoming</th>
              <th className="px-5 py-4">Reorder Level</th>
              <th className="px-5 py-4">Inventory Value</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
              >
                <td className="px-5 py-4 font-medium text-[#f7ead2]">
                  {item.product.name}
                  <p className="mt-1 text-xs text-[#e8dcc8]/45">
                    {item.product.category}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <div className="relative h-14 w-14 overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
                    {item.product.image ? (
                      item.product.image.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="absolute inset-0 h-full w-full object-contain p-2"
                        />
                      ) : (
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          sizes="56px"
                          className="object-contain p-2"
                        />
                      )
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-4">{item.product.sku}</td>
                <td className="px-5 py-4">{item.product.barcode}</td>
                <td className="px-5 py-4">{item.product.brand}</td>
                <td className="px-5 py-4">{item.location_name}</td>
                <td className="px-5 py-4">{item.on_hand_quantity}</td>
                <td className="px-5 py-4">{item.reserved_quantity}</td>
                <td className="px-5 py-4">{item.available_quantity}</td>
                <td className="px-5 py-4">{item.incoming_quantity}</td>
                <td className="px-5 py-4">{item.reorder_level}</td>
                <td className="px-5 py-4">
                  {formatCurrency(item.inventory_value)}
                </td>
                <td className="px-5 py-4">{getInventoryStatus(item)}</td>
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/inventory/${item.id}`}
                    className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-[#e8dcc8]/52">
        Data Source: {summary.source}. Inventory deduction from POS sales remains
        reserved for a future phase.
      </p>
    </div>
  );
}
