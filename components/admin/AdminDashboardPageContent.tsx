"use client";

import AdminDashboardStats from "@/components/admin/AdminDashboardStats";
import AdminQuickActions, {
  type AdminQuickActionKey,
} from "@/components/admin/AdminQuickActions";
import { useLanguage } from "@/components/LanguageProvider";

type AdminDashboardPageContentProps = {
  actions: {
    key: AdminQuickActionKey;
    href: string;
  }[];
  mediaCount: number;
};

export default function AdminDashboardPageContent({
  actions,
  mediaCount,
}: AdminDashboardPageContentProps) {
  const { t } = useLanguage();

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#f7ead2] sm:text-4xl">
          {t.admin.dashboard.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/66 sm:text-base">
          {t.admin.dashboard.description}
        </p>
      </div>

      <AdminQuickActions actions={actions} />
      <AdminDashboardStats mediaCount={mediaCount} />
    </>
  );
}
