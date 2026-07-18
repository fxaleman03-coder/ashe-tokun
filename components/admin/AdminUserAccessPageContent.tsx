"use client";

import AdminStaffManager from "@/components/admin/AdminStaffManager";
import { useLanguage } from "@/components/LanguageProvider";
import type { StaffMember, StaffMetrics } from "@/lib/types/staff";

type AdminUserAccessPageContentProps = {
  staff: StaffMember[];
  metrics: StaffMetrics;
  currentTime: number;
};

export default function AdminUserAccessPageContent({
  staff,
  metrics,
  currentTime,
}: AdminUserAccessPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.userAccess;

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

      <AdminStaffManager
        staff={staff}
        metrics={metrics}
        currentTime={currentTime}
      />
    </>
  );
}
