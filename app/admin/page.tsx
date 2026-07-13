import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import AdminDashboardStats from "@/components/admin/AdminDashboardStats";
import { getMediaAssets } from "@/lib/data/mediaRepository";

export default async function AdminDashboardPage() {
  const mediaCount = (await getMediaAssets()).length;

  return (
    <AdminShell
      title="Dashboard"
      description="Manage products, inventory, orders, and the future growth of ASHE TOKUN."
    >
      <section className="mb-6 border border-[#d8a344]/20 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d8a344]">
              Staff Operations
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[#f7ead2]">
              Open Staff Operations Portal
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e8dcc8]/60">
              Daily store operations now have a separate command center for POS,
              orders, inventory, customers, shipping, and returns.
            </p>
          </div>
          <Link
            href="/staff"
            className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344] transition duration-300 hover:bg-[#d8a344] hover:text-[#0f0b07] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
          >
            Open Staff Portal
          </Link>
        </div>
      </section>
      <AdminDashboardStats mediaCount={mediaCount} />
    </AdminShell>
  );
}
