"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import ProductBarcodePrintDialog from "@/components/admin/ProductBarcodePrintDialog";
import {
  mergeProductCatalog,
  useProductOverrides,
} from "@/lib/productStore";
import type { Product } from "@/lib/products";

type AdminProductsTableProps = {
  products: Product[];
  canPrintLabels: boolean;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function AdminProductsTable({
  products,
  canPrintLabels,
}: AdminProductsTableProps) {
  const { language, t } = useLanguage();
  const labels = t.admin.products.table;
  const overrides = useProductOverrides();
  const displayProducts = mergeProductCatalog(products, overrides);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const selectedProducts = useMemo(
    () =>
      displayProducts
        .filter((product) => selectedProductIds.includes(product.id))
        .map((product) => ({
          id: product.id,
          name: product.name[language] ?? product.name.en,
          sku: product.sku,
          barcodeValue: product.barcodeValue ?? product.barcode,
          price: product.price,
        })),
    [displayProducts, language, selectedProductIds],
  );

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((currentIds) =>
      currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId],
    );
  }

  return (
    <div className="space-y-4">
      {selectedProducts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[#d8a344]/25 bg-[#120d08] p-4">
          <p className="text-sm font-medium text-[#f7ead2]">
            {selectedProducts.length} {labels.selectedProducts}
          </p>
          <ProductBarcodePrintDialog
            products={selectedProducts}
            canPrint={canPrintLabels}
            triggerLabel={labels.printLabels}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">{labels.select}</th>
              <th className="px-5 py-4">{labels.product}</th>
              <th className="px-5 py-4">{labels.sku}</th>
              <th className="px-5 py-4">{labels.vendor}</th>
              <th className="px-5 py-4">{labels.category}</th>
              <th className="px-5 py-4">{labels.price}</th>
              <th className="px-5 py-4">{labels.stock}</th>
              <th className="px-5 py-4">{labels.status}</th>
              <th className="px-5 py-4">{labels.featured}</th>
              <th className="px-5 py-4">{labels.edit}</th>
            </tr>
          </thead>
          <tbody>
            {displayProducts.map((product) => (
              <tr
                key={product.id}
                className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
              >
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    aria-label={`${labels.select} ${product.name[language] ?? product.name.en}`}
                    className="h-4 w-4 accent-[#d8a344]"
                  />
                </td>
                <td className="px-5 py-4 font-medium text-[#f7ead2]">
                  <span className="block">
                    {product.name[language] ?? product.name.en}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-[#e8dcc8]/42">
                    {labels.barcode}: {product.barcodeValue ?? product.barcode}
                  </span>
                </td>
                <td className="px-5 py-4">{product.sku}</td>
                <td className="px-5 py-4">{product.vendor}</td>
                <td className="px-5 py-4">
                  {product.category[language] ?? product.category.en}
                </td>
                <td className="px-5 py-4">{formatPrice(product.price)}</td>
                <td className="px-5 py-4">{product.stock}</td>
                <td className="px-5 py-4">
                  {product.inStock ? labels.readyToShip : labels.unavailable}
                </td>
                <td className="px-5 py-4">
                  {product.isFeatured ? labels.yes : labels.no}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/products/${product.slug}/edit`}
                    className="inline-flex min-h-9 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
                  >
                    {labels.edit}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
