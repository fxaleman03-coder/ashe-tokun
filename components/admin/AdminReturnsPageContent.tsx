"use client";

import AdminReturnsManager from "@/components/admin/AdminReturnsManager";
import { useLanguage } from "@/components/LanguageProvider";
import type { ReturnMetrics, ReturnRecord } from "@/lib/types/return";

type AdminReturnsPageContentProps = {
  returns: ReturnRecord[];
  metrics: ReturnMetrics;
};

export default function AdminReturnsPageContent({
  returns,
  metrics,
}: AdminReturnsPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.returns;

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

      <AdminReturnsManager returns={returns} metrics={metrics} />
    </>
  );
}
