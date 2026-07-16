"use client";

import AdminCustomersManager from "@/components/admin/AdminCustomersManager";
import { useLanguage } from "@/components/LanguageProvider";
import type { Customer, CustomerMetrics } from "@/lib/types/customer";

type AdminCustomersPageContentProps = {
  customers: Customer[];
  metrics: CustomerMetrics;
};

export default function AdminCustomersPageContent({
  customers,
  metrics,
}: AdminCustomersPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.customers;

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

      <AdminCustomersManager customers={customers} metrics={metrics} />
    </>
  );
}
