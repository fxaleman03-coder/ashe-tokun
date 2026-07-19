"use client";

import Link from "next/link";
import AdminProductsTable from "@/components/admin/AdminProductsTable";
import { useLanguage } from "@/components/LanguageProvider";
import type { Product } from "@/lib/products";

type AdminProductsPageContentProps = {
  products: Product[];
  productSourceStatus: string;
  canPrintLabels: boolean;
};

export default function AdminProductsPageContent({
  products,
  productSourceStatus,
  canPrintLabels,
}: AdminProductsPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.products;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#f7ead2] sm:text-4xl">
          {labels.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/66 sm:text-base">
          {labels.description}
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
            {labels.dataSource}
          </p>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
            {productSourceStatus}
          </p>
        </div>
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
            {labels.fallback}
          </p>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
            {labels.available}
          </p>
        </div>
        <Link
          href="/admin/products"
          className="inline-flex min-h-12 items-center justify-center self-start border border-[#f7ead2]/14 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344] lg:self-center"
        >
          {labels.allProducts}
        </Link>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-12 items-center justify-center self-start bg-[#d8a344] px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)] lg:self-center"
        >
          {labels.addProduct}
        </Link>
        <Link
          href="/admin/products/labels"
          className="inline-flex min-h-12 items-center justify-center self-start border border-[#d8a344]/45 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07] lg:self-center"
        >
          {labels.printLabels}
        </Link>
      </div>

      <AdminProductsTable
        products={products}
        canPrintLabels={canPrintLabels}
      />
    </>
  );
}
