"use client";

import { CatalogStatCard } from "@/components/admin/CatalogViews";
import { useLanguage } from "@/components/LanguageProvider";
import type { CatalogMetrics } from "@/lib/data/catalogMetrics";

type AdminCatalogPageContentProps = {
  metrics: CatalogMetrics;
  mediaCount: number;
};

const catalogMap = [
  "ASHE TOKUN Storefront",
  "├── AJAKO ORIGINALS",
  "│   ├── Keychains",
  "│   ├── Opele",
  "│   ├── Opon",
  "│   ├── Odu Tablets",
  "│   ├── Lamps",
  "│   └── Sacred Arts",
  "└── EDIBERE CREATION",
  "    ├── Ide",
  "    ├── Elekes",
  "    ├── Sets",
  "    ├── Mazos",
  "    └── Beadwork",
];

export default function AdminCatalogPageContent({
  metrics,
  mediaCount,
}: AdminCatalogPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.catalog;
  const common = t.admin.common;

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

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <CatalogStatCard
          label={common.dataSource}
          value={
            metrics.productSourceStatus === "Supabase"
              ? common.supabase
              : common.localFallback
          }
          detail={labels.details.dataSource}
        />
        <CatalogStatCard
          label={common.fallback}
          value={common.available}
          detail={labels.details.fallback}
        />
        <CatalogStatCard
          label={labels.metrics.products}
          value={String(metrics.totalProducts)}
          detail={labels.details.products}
        />
        <CatalogStatCard
          label={labels.metrics.activeProducts}
          value={String(metrics.activeProducts)}
          detail={labels.details.activeProducts}
        />
        <CatalogStatCard
          label={labels.metrics.inactiveProducts}
          value={String(metrics.inactiveProducts)}
          detail={labels.details.inactiveProducts}
        />
        <CatalogStatCard
          label={labels.metrics.featured}
          value={String(metrics.featuredProducts)}
          detail={labels.details.featured}
        />
        <CatalogStatCard
          label={labels.metrics.newArrivals}
          value={String(metrics.newArrivalProducts)}
          detail={labels.details.newArrivals}
        />
        <CatalogStatCard
          label={labels.metrics.online}
          value={String(metrics.availableOnlineProducts)}
          detail={labels.details.online}
        />
        <CatalogStatCard
          label={labels.metrics.inStore}
          value={String(metrics.availableInStoreProducts)}
          detail={labels.details.inStore}
        />
        <CatalogStatCard
          label={labels.metrics.lowStock}
          value={String(metrics.lowStockProducts)}
          detail={labels.details.lowStock}
        />
        <CatalogStatCard
          label={labels.metrics.outOfStock}
          value={String(metrics.outOfStockProducts)}
          detail={labels.details.outOfStock}
        />
        <CatalogStatCard
          label={labels.metrics.brands}
          value={String(metrics.brandsCount)}
          detail={labels.details.brands}
        />
        <CatalogStatCard
          label={labels.metrics.collections}
          value={String(metrics.collectionsCount)}
          detail={labels.details.collections}
        />
        <CatalogStatCard
          label={labels.metrics.categories}
          value={String(metrics.categoriesCount)}
          detail={labels.details.categories}
        />
        <CatalogStatCard
          label={labels.metrics.productTypes}
          value={String(metrics.productTypesCount)}
          detail={labels.details.productTypes}
        />
        <CatalogStatCard
          label={labels.metrics.traditions}
          value={String(metrics.traditionsCount)}
          detail={labels.details.traditions}
        />
        <CatalogStatCard
          label={labels.metrics.mediaAssets}
          value={String(mediaCount)}
          detail={labels.details.mediaAssets}
        />
      </section>

      <section className="mt-8 border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
          {labels.catalogMap}
        </p>
        <pre className="mt-5 overflow-x-auto whitespace-pre text-sm leading-7 text-[#e8dcc8]/72">
          {catalogMap.join("\n")}
        </pre>
      </section>
    </>
  );
}
