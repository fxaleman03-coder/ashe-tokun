import AdminShell from "@/components/admin/AdminShell";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminAnalyticsPage() {
  await requirePermission("reports.sales");

  return (
    <AdminShell
      title="Analytics"
      description="Reporting dashboards are not enabled for production launch."
    >
      <section className="max-w-3xl border border-[#f7ead2]/10 bg-[#120d08] p-8 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
          Coming Soon
        </p>
        <h2 className="mt-4 font-serif text-3xl font-semibold text-[#f7ead2]">
          Analytics are not active yet.
        </h2>
        <p className="mt-4 text-sm leading-6 text-[#e8dcc8]/64">
          Revenue, product performance, customer behavior, and catalog insight
          reports will be enabled after production reporting requirements are
          finalized. No analytics actions are available on this page.
        </p>
      </section>
    </AdminShell>
  );
}
