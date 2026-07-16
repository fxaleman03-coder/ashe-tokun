"use client";

import { ManagementCard } from "@/components/admin/CatalogViews";
import { useLanguage } from "@/components/LanguageProvider";
import type { ProductTypeReadResult } from "@/lib/data/productTypes";

type AdminProductTypesPageContentProps = {
  productTypes: ProductTypeReadResult["productTypes"];
  source: ProductTypeReadResult["source"];
};

export default function AdminProductTypesPageContent({
  productTypes,
  source,
}: AdminProductTypesPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.productTypes;
  const common = t.admin.common;
  const dataSource =
    source === "supabase" ? common.supabase : common.localFallback;
  const productTypeDisplayNames: Record<string, string> = {
    "handmade-product": labels.displayNames.handmadeProduct,
    "made-to-order": labels.displayNames.madeToOrder,
    "physical-product": labels.displayNames.physicalProduct,
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#f7ead2] sm:text-4xl">
          {labels.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/66 sm:text-base">
          {labels.description}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            {common.dataSource}
          </p>
          <p className="mt-4 font-serif text-3xl font-semibold text-[#f7ead2]">
            {dataSource}
          </p>
        </article>
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            {common.fallback}
          </p>
          <p className="mt-4 font-serif text-3xl font-semibold text-[#f7ead2]">
            {common.available}
          </p>
        </article>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {productTypes.map((productType) => (
          <ManagementCard
            key={productType.id}
            title={
              productTypeDisplayNames[productType.slug] ?? productType.name
            }
            description={productType.description ?? common.pending}
            meta={productType.slug}
            status={productType.active ? common.active : common.inactive}
            action={common.view}
          />
        ))}
      </section>
    </div>
  );
}
