"use client";

import { ManagementTable } from "@/components/admin/CatalogViews";
import { useLanguage } from "@/components/LanguageProvider";
import type { CategoryReadResult } from "@/lib/data/categories";

type AdminCategoriesPageContentProps = {
  categories: CategoryReadResult["categories"];
  source: CategoryReadResult["source"];
};

export default function AdminCategoriesPageContent({
  categories,
  source,
}: AdminCategoriesPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.categories;
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
        rows={categories}
        columns={[
          { label: labels.category, render: (category) => category.name },
          { label: common.slug, render: (category) => category.slug },
          {
            label: common.description,
            render: (category) => category.description ?? common.pending,
          },
          {
            label: labels.parent,
            render: (category) =>
              category.parent_category_id ?? common.noParent,
          },
          {
            label: common.status,
            render: (category) =>
              category.active ? common.active : common.inactive,
          },
        ]}
      />
    </div>
  );
}
