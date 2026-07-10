"use client";

import { useProductCatalog } from "@/lib/productStore";
import type { Product } from "@/lib/products";

function getInventoryStatus(product: Product) {
  if (product.stock === 0) {
    return "Out of Stock";
  }

  if (
    typeof product.reorderLevel === "number" &&
    product.stock <= product.reorderLevel
  ) {
    return "Low Stock";
  }

  return "Ready to Ship";
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

export default function AdminInventoryTable() {
  const products = useProductCatalog();

  return (
    <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <table className="w-full min-w-[1120px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
            <th className="px-5 py-4">Product</th>
            <th className="px-5 py-4">SKU</th>
            <th className="px-5 py-4">Barcode</th>
            <th className="px-5 py-4">Stock</th>
            <th className="px-5 py-4">Reorder Level</th>
            <th className="px-5 py-4">Location</th>
            <th className="px-5 py-4">Online</th>
            <th className="px-5 py-4">In Store</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
            >
              <td className="px-5 py-4 font-medium text-[#f7ead2]">
                {product.name.en}
              </td>
              <td className="px-5 py-4">{product.sku}</td>
              <td className="px-5 py-4">{product.barcode}</td>
              <td className="px-5 py-4">{product.stock}</td>
              <td className="px-5 py-4">
                {product.reorderLevel ?? "Not set"}
              </td>
              <td className="px-5 py-4">
                {product.inventoryLocation ?? "Unassigned"}
              </td>
              <td className="px-5 py-4">
                {formatBoolean(product.availableOnline)}
              </td>
              <td className="px-5 py-4">
                {formatBoolean(product.availableInStore)}
              </td>
              <td className="px-5 py-4">{getInventoryStatus(product)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
