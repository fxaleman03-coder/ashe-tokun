"use client";

import Link from "next/link";
import { useProductCatalog } from "@/lib/productStore";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function AdminProductsTable() {
  const products = useProductCatalog();

  return (
    <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <table className="w-full min-w-[940px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
            <th className="px-5 py-4">Product</th>
            <th className="px-5 py-4">Vendor</th>
            <th className="px-5 py-4">Category</th>
            <th className="px-5 py-4">Tradition</th>
            <th className="px-5 py-4">Price</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Featured</th>
            <th className="px-5 py-4">Edit</th>
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
              <td className="px-5 py-4">{product.vendor}</td>
              <td className="px-5 py-4">{product.category.en}</td>
              <td className="px-5 py-4">{product.tradition.en}</td>
              <td className="px-5 py-4">{formatPrice(product.price)}</td>
              <td className="px-5 py-4">
                {product.inStock ? "Ready to Ship" : "Unavailable"}
              </td>
              <td className="px-5 py-4">{product.isFeatured ? "Yes" : "No"}</td>
              <td className="px-5 py-4">
                <Link
                  href={`/admin/products/${product.slug}/edit`}
                  className="inline-flex min-h-9 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
