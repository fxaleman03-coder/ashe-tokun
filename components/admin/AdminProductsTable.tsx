"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import ProductBarcodePrintDialog from "@/components/admin/ProductBarcodePrintDialog";
import {
  updateProductStatuses,
  type ProductStatus,
} from "@/lib/data/productMutations";
import {
  mergeProductCatalog,
  useProductOverrides,
} from "@/lib/productStore";
import type { Product } from "@/lib/products";

type AdminProductsTableProps = {
  products: Product[];
  canPrintLabels: boolean;
  canEditProducts: boolean;
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
  canEditProducts,
}: AdminProductsTableProps) {
  const { language, t } = useLanguage();
  const labels = t.admin.products.table;
  const overrides = useProductOverrides();
  const mergedProducts = mergeProductCatalog(products, overrides);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, ProductStatus>
  >({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const displayProducts = useMemo(
    () =>
      mergedProducts.map((product) => ({
        ...product,
        status: statusOverrides[product.id] ?? product.status ?? "active",
      })),
    [mergedProducts, statusOverrides],
  );
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

  async function changeStatus(productIds: string[], nextStatus: ProductStatus) {
    if (!canEditProducts || isUpdatingStatus) {
      return;
    }

    setIsUpdatingStatus(true);
    setStatusMessage("");

    try {
      const result = await updateProductStatuses(productIds, nextStatus);

      if (!result.ok) {
        setStatusMessage(`${labels.statusUpdateFailed}: ${result.error}`);
        return;
      }

      if (result.updatedProductIds.length === 0) {
        setStatusMessage(labels.noStatusChanges);
        return;
      }

      setStatusOverrides((currentStatuses) => {
        const nextStatuses = { ...currentStatuses };

        for (const productId of result.updatedProductIds) {
          nextStatuses[productId] = result.status;
        }

        return nextStatuses;
      });
      setStatusMessage(
        labels.statusUpdateSuccess.replace(
          "{count}",
          String(result.updatedProductIds.length),
        ),
      );
    } catch {
      setStatusMessage(labels.statusUpdateFailed);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function getInventoryStatus(product: Product) {
    if (product.stock <= 0) {
      return {
        label: labels.outOfStock,
        className: "border-red-300/25 bg-red-950/35 text-red-100",
      };
    }

    if (
      typeof product.reorderLevel === "number" &&
      product.stock <= product.reorderLevel
    ) {
      return {
        label: labels.lowStock,
        className: "border-amber-300/25 bg-amber-950/35 text-amber-100",
      };
    }

    return {
      label: labels.inStock,
      className: "border-emerald-300/25 bg-emerald-950/30 text-emerald-100",
    };
  }

  function getPublicationStatus(status: ProductStatus) {
    if (status === "draft") {
      return {
        label: labels.draft,
        className: "border-amber-300/25 bg-amber-950/35 text-amber-100",
      };
    }

    if (status === "archived") {
      return {
        label: labels.archived,
        className: "border-slate-300/20 bg-slate-800/40 text-slate-200",
      };
    }

    return {
      label: labels.active,
      className: "border-emerald-300/25 bg-emerald-950/30 text-emerald-100",
    };
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
          {canEditProducts ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => changeStatus(selectedProductIds, "active")}
                disabled={isUpdatingStatus}
                className="min-h-10 border border-emerald-300/30 px-4 text-[0.64rem] font-bold uppercase tracking-[0.15em] text-emerald-100 transition hover:bg-emerald-950/50 disabled:opacity-50"
              >
                {labels.publishSelected}
              </button>
              <button
                type="button"
                onClick={() => changeStatus(selectedProductIds, "archived")}
                disabled={isUpdatingStatus}
                className="min-h-10 border border-slate-300/25 px-4 text-[0.64rem] font-bold uppercase tracking-[0.15em] text-slate-200 transition hover:bg-slate-800/50 disabled:opacity-50"
              >
                {labels.archiveSelected}
              </button>
              <button
                type="button"
                onClick={() => changeStatus(selectedProductIds, "draft")}
                disabled={isUpdatingStatus}
                className="min-h-10 border border-amber-300/30 px-4 text-[0.64rem] font-bold uppercase tracking-[0.15em] text-amber-100 transition hover:bg-amber-950/50 disabled:opacity-50"
              >
                {labels.moveSelectedToDraft}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {statusMessage ? (
        <p
          role="status"
          className="border border-[#f7ead2]/10 bg-[#120d08] px-4 py-3 text-sm text-[#e8dcc8]/72"
        >
          {statusMessage}
        </p>
      ) : null}

      <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[1240px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">{labels.select}</th>
              <th className="px-5 py-4">{labels.product}</th>
              <th className="px-5 py-4">{labels.sku}</th>
              <th className="px-5 py-4">{labels.vendor}</th>
              <th className="px-5 py-4">{labels.category}</th>
              <th className="px-5 py-4">{labels.price}</th>
              <th className="px-5 py-4">{labels.stock}</th>
              <th className="px-5 py-4">{labels.inventoryStatus}</th>
              <th className="px-5 py-4">{labels.publicationStatus}</th>
              <th className="px-5 py-4">{labels.featured}</th>
              <th className="px-5 py-4">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {displayProducts.map((product) => {
              const inventoryStatus = getInventoryStatus(product);
              const publicationStatus = getPublicationStatus(
                product.status ?? "active",
              );

              return (
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
                  <span
                    className={`inline-flex items-center border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${inventoryStatus.className}`}
                  >
                    {inventoryStatus.label}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${publicationStatus.className}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {publicationStatus.label}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {product.isFeatured ? labels.yes : labels.no}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/products/${product.slug}/edit`}
                    className="inline-flex min-h-9 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
                  >
                    {labels.edit}
                  </Link>
                  {canEditProducts && product.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => changeStatus([product.id], "active")}
                      disabled={isUpdatingStatus}
                      className="inline-flex min-h-9 items-center justify-center border border-emerald-300/30 px-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-950/50 disabled:opacity-50"
                    >
                      {labels.publish}
                    </button>
                  ) : null}
                  {canEditProducts && product.status === "active" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => changeStatus([product.id], "archived")}
                        disabled={isUpdatingStatus}
                        className="inline-flex min-h-9 items-center justify-center border border-slate-300/25 px-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-slate-800/50 disabled:opacity-50"
                      >
                        {labels.archive}
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus([product.id], "draft")}
                        disabled={isUpdatingStatus}
                        className="inline-flex min-h-9 items-center justify-center border border-amber-300/30 px-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-950/50 disabled:opacity-50"
                      >
                        {labels.moveToDraft}
                      </button>
                    </>
                  ) : null}
                  {canEditProducts && product.status === "archived" ? (
                    <button
                      type="button"
                      onClick={() => changeStatus([product.id], "active")}
                      disabled={isUpdatingStatus}
                      className="inline-flex min-h-9 items-center justify-center border border-emerald-300/30 px-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-950/50 disabled:opacity-50"
                    >
                      {labels.restoreToActive}
                    </button>
                  ) : null}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
