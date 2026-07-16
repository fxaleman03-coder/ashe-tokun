"use client";

import AdminOrdersManager from "@/components/admin/AdminOrdersManager";
import { useLanguage } from "@/components/LanguageProvider";
import type {
  AdminOrder,
  OrderSummaryMetrics,
} from "@/lib/data/ordersRepository";

type AdminOrdersPageContentProps = {
  orders: AdminOrder[];
  metrics: OrderSummaryMetrics;
};

export default function AdminOrdersPageContent({
  orders,
  metrics,
}: AdminOrdersPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.orders;

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

      <AdminOrdersManager orders={orders} metrics={metrics} />
    </>
  );
}
