"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import ProductBarcodePrintDialog from "@/components/admin/ProductBarcodePrintDialog";
import { mergeProductCatalog, useProductOverrides } from "@/lib/productStore";
import type { Product } from "@/lib/products";

type AdminProductLabelsPageContentProps = {
  products: Product[];
  canPrintLabels: boolean;
};

export default function AdminProductLabelsPageContent({
  products,
  canPrintLabels,
}: AdminProductLabelsPageContentProps) {
  const { language, t } = useLanguage();
  const productLabels = t.admin.products;
  const barcodeLabels = t.admin.productIdentification;
  const displayProducts = mergeProductCatalog(products, useProductOverrides());
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
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#f7ead2] sm:text-4xl">
            {barcodeLabels.printLabels}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/66 sm:text-base">
            {barcodeLabels.previewDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/products"
            className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/14 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition hover:border-[#d8a344]/70 hover:text-[#d8a344]"
          >
            {productLabels.allProducts}
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
          >
            {productLabels.addProduct}
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-[#d8a344]/25 bg-[#120d08] p-4">
        <p className="text-sm font-medium text-[#f7ead2]">
          {selectedProducts.length} {productLabels.table.selectedProducts}
        </p>
        <ProductBarcodePrintDialog
          products={selectedProducts}
          canPrint={canPrintLabels}
          triggerLabel={barcodeLabels.printLabels}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {displayProducts.map((product) => {
          const productName = product.name[language] ?? product.name.en;
          const barcodeValue = product.barcodeValue ?? product.barcode;

          return (
            <label
              key={product.id}
              className="flex items-start gap-4 border border-[#f7ead2]/10 bg-[#120d08] p-4 text-sm text-[#e8dcc8]/72 transition hover:border-[#d8a344]/45"
            >
              <input
                type="checkbox"
                checked={selectedProductIds.includes(product.id)}
                onChange={() => toggleProductSelection(product.id)}
                aria-label={`${productLabels.table.select} ${productName}`}
                className="mt-1 h-4 w-4 accent-[#d8a344]"
              />
              <span>
                <span className="block font-semibold text-[#f7ead2]">
                  {productName}
                </span>
                <span className="mt-1 block font-mono text-xs text-[#e8dcc8]/50">
                  {barcodeLabels.barcodeValue}: {barcodeValue}
                </span>
                <span className="mt-1 block font-mono text-xs text-[#e8dcc8]/50">
                  {barcodeLabels.sku}: {product.sku}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
