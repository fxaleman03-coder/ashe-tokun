import AdminShell from "@/components/admin/AdminShell";
import { CatalogStatCard } from "@/components/admin/CatalogViews";
import { getCatalogMetrics } from "@/lib/data/catalogMetrics";
import { getMediaAssets } from "@/lib/data/mediaRepository";

const catalogMap = [
  "ASHE TOKUN Storefront",
  "├── AJAKO ORIGINALS",
  "│   ├── Keychains",
  "│   ├── Opele",
  "│   ├── Opon",
  "│   ├── Odu Tablets",
  "│   ├── Lamps",
  "│   └── Sacred Arts",
  "└── ODIBERE CREATIONS",
  "    ├── Ide",
  "    ├── Elekes",
  "    ├── Sets",
  "    ├── Mazos",
  "    └── Beadwork",
];

export default async function AdminCatalogPage() {
  const metrics = await getCatalogMetrics();
  const mediaCount = (await getMediaAssets()).length;

  return (
    <AdminShell
      title="Catalog Overview"
      description="Manage the structure that powers ASHE TOKUN vendors, collections, categories, product types, traditions, products, and media."
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <CatalogStatCard
          label="Data Source"
          value={metrics.productSourceStatus}
          detail="Catalog metrics are read through live helpers with local fallback."
        />
        <CatalogStatCard
          label="Fallback"
          value="Available"
          detail="Local catalog data remains available when Supabase returns no rows."
        />
        <CatalogStatCard
          label="Products"
          value={String(metrics.totalProducts)}
          detail="Repository-backed catalog products."
        />
        <CatalogStatCard
          label="Active Products"
          value={String(metrics.activeProducts)}
          detail="Products currently returned for catalog use."
        />
        <CatalogStatCard
          label="Inactive Products"
          value={String(metrics.inactiveProducts)}
          detail="Inactive products are not currently returned by the repository."
        />
        <CatalogStatCard
          label="Featured"
          value={String(metrics.featuredProducts)}
          detail="Products highlighted in merchandising surfaces."
        />
        <CatalogStatCard
          label="New Arrivals"
          value={String(metrics.newArrivalProducts)}
          detail="Products marked for new arrival merchandising."
        />
        <CatalogStatCard
          label="Online"
          value={String(metrics.availableOnlineProducts)}
          detail="Products currently available for storefront display."
        />
        <CatalogStatCard
          label="In Store"
          value={String(metrics.availableInStoreProducts)}
          detail="Products currently available for physical store sale."
        />
        <CatalogStatCard
          label="Low Stock"
          value={String(metrics.lowStockProducts)}
          detail="Products at or below their reorder threshold."
        />
        <CatalogStatCard
          label="Out of Stock"
          value={String(metrics.outOfStockProducts)}
          detail="Products with no stock available."
        />
        <CatalogStatCard
          label="Brands"
          value={String(metrics.brandsCount)}
          detail="Customer-facing brands and artisan partners."
        />
        <CatalogStatCard
          label="Collections"
          value={String(metrics.collectionsCount)}
          detail="Merchandising groups and storefront edits."
        />
        <CatalogStatCard
          label="Categories"
          value={String(metrics.categoriesCount)}
          detail="Product taxonomy for browsing and management."
        />
        <CatalogStatCard
          label="Product Types"
          value={String(metrics.productTypesCount)}
          detail="Commerce behavior and product handling types."
        />
        <CatalogStatCard
          label="Traditions"
          value={String(metrics.traditionsCount)}
          detail="Cultural and devotional catalog groupings."
        />
        <CatalogStatCard
          label="Media Assets"
          value={String(mediaCount)}
          detail="Images discovered inside public product media."
        />
      </section>

      <section className="mt-8 border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
          Catalog Map
        </p>
        <pre className="mt-5 overflow-x-auto whitespace-pre text-sm leading-7 text-[#e8dcc8]/72">
          {catalogMap.join("\n")}
        </pre>
      </section>
    </AdminShell>
  );
}
