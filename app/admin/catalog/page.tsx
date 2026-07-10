import AdminShell from "@/components/admin/AdminShell";
import { CatalogStatCard } from "@/components/admin/CatalogViews";
import {
  categories,
  collections,
  productTypes,
  traditions,
  vendors,
} from "@/lib/catalog";
import { getProductMedia } from "@/lib/media";
import { products } from "@/lib/products";

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

export default function AdminCatalogPage() {
  const mediaCount = getProductMedia().length;

  return (
    <AdminShell
      title="Catalog Overview"
      description="Manage the structure that powers ASHE TOKUN vendors, collections, categories, product types, traditions, products, and media."
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <CatalogStatCard
          label="Vendors"
          value={String(vendors.length)}
          detail="Official brands and artisan partners."
        />
        <CatalogStatCard
          label="Collections"
          value={String(collections.length)}
          detail="Merchandising groups and storefront edits."
        />
        <CatalogStatCard
          label="Categories"
          value={String(categories.length)}
          detail="Product taxonomy for browsing and management."
        />
        <CatalogStatCard
          label="Product Types"
          value={String(productTypes.length)}
          detail="Commerce behavior and product handling types."
        />
        <CatalogStatCard
          label="Traditions"
          value={String(traditions.length)}
          detail="Cultural and devotional catalog groupings."
        />
        <CatalogStatCard
          label="Products"
          value={String(products.length)}
          detail="Current seed catalog products."
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
