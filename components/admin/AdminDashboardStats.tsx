"use client";

import AdminStatCard from "@/components/admin/AdminStatCard";
import { useProductCatalog } from "@/lib/productStore";

type AdminDashboardStatsProps = {
  mediaCount: number;
};

export default function AdminDashboardStats({
  mediaCount,
}: AdminDashboardStatsProps) {
  const products = useProductCatalog();
  const featuredCount = products.filter((product) => product.isFeatured).length;
  const inventoryCount = products.filter((product) => product.inStock).length;

  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        label="Products"
        value={String(products.length)}
        detail={`${featuredCount} featured on the storefront preview.`}
        marker="P"
      />
      <AdminStatCard
        label="Featured Items"
        value={String(featuredCount)}
        detail="Curated products highlighted on the homepage."
        marker="F"
      />
      <AdminStatCard
        label="Inventory Items"
        value={String(inventoryCount)}
        detail="Products currently marked ready to ship."
        marker="I"
      />
      <AdminStatCard
        label="Media"
        value={String(mediaCount)}
        detail="Images discovered inside the public product media library."
        marker="M"
      />
      <AdminStatCard
        label="Orders"
        value="0"
        detail="Orders are not connected until backend setup begins."
        marker="O"
      />
      <AdminStatCard
        label="Customers"
        value="0"
        detail="Customer records will appear after auth and checkout setup."
        marker="C"
      />
      <AdminStatCard
        label="Revenue"
        value="$0.00"
        detail="Revenue analytics will connect in a future phase."
        marker="$"
      />
      <AdminStatCard
        label="Store Status"
        value="Draft"
        detail="Catalog and storefront UI are in foundation mode."
        marker="S"
      />
    </section>
  );
}
