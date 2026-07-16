"use client";

import { ManagementTable } from "@/components/admin/CatalogViews";
import { useLanguage } from "@/components/LanguageProvider";
import type { BrandReadResult } from "@/lib/data/brands";

type AdminVendorsPageContentProps = {
  brands: BrandReadResult["brands"];
  source: BrandReadResult["source"];
};

export default function AdminVendorsPageContent({
  brands,
  source,
}: AdminVendorsPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.vendors;
  const common = t.admin.common;
  const dataSource = source === "supabase" ? common.supabase : common.localFallback;

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

      <ManagementTable
        rows={brands}
        columns={[
          { label: labels.brand, render: (brand) => brand.name },
          { label: common.slug, render: (brand) => brand.slug },
          {
            label: common.description,
            render: (brand) => brand.description ?? common.pending,
          },
          {
            label: common.status,
            render: (brand) => (brand.active ? common.active : common.inactive),
          },
        ]}
      />
    </div>
  );
}
