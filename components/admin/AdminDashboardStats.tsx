"use client";

import { useLanguage } from "@/components/LanguageProvider";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { useProductCatalog } from "@/lib/productStore";

type AdminDashboardStatsProps = {
  mediaCount: number;
};

export default function AdminDashboardStats({
  mediaCount,
}: AdminDashboardStatsProps) {
  const { t } = useLanguage();
  const stats = t.admin.dashboard.stats;
  const products = useProductCatalog();
  const featuredCount = products.filter((product) => product.isFeatured).length;
  const inventoryCount = products.filter((product) => product.inStock).length;

  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        label={stats.products}
        value={String(products.length)}
        detail={stats.productsDetail.replace("{count}", String(featuredCount))}
        marker="P"
      />
      <AdminStatCard
        label={stats.featuredItems}
        value={String(featuredCount)}
        detail={stats.featuredItemsDetail}
        marker="F"
      />
      <AdminStatCard
        label={stats.inventoryItems}
        value={String(inventoryCount)}
        detail={stats.inventoryItemsDetail}
        marker="I"
      />
      <AdminStatCard
        label={stats.media}
        value={String(mediaCount)}
        detail={stats.mediaDetail}
        marker="M"
      />
      <AdminStatCard
        label={stats.orders}
        value="0"
        detail={stats.ordersDetail}
        marker="O"
      />
      <AdminStatCard
        label={stats.pos}
        value={stats.posReady}
        detail={stats.posDetail}
        marker="P"
      />
      <AdminStatCard
        label={stats.customers}
        value="0"
        detail={stats.customersDetail}
        marker="C"
      />
      <AdminStatCard
        label={stats.revenue}
        value="$0.00"
        detail={stats.revenueDetail}
        marker="$"
      />
      <AdminStatCard
        label={stats.storeStatus}
        value={stats.operational}
        detail={stats.storeStatusDetail}
        marker="S"
      />
    </section>
  );
}
