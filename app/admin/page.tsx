import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import AdminDashboardStats from "@/components/admin/AdminDashboardStats";
import AdminQuickActions, {
  type AdminQuickActionKey,
} from "@/components/admin/AdminQuickActions";
import { getMediaAssets } from "@/lib/data/mediaRepository";
import { hasPermission } from "@/lib/staff/permissionHelpers";
import {
  getCurrentStaffPermissions,
  requirePermission,
} from "@/lib/staff/permissionGuard";
import type { PermissionKey } from "@/lib/staff/permissionTypes";

const quickActions: {
  key: AdminQuickActionKey;
  href: string;
  permissions: PermissionKey[];
}[] = [
  { key: "newEmployee", href: "/admin/staff/new", permissions: ["staff.create"] },
  {
    key: "createPayrollPeriod",
    href: "/admin/payroll/new",
    permissions: ["payroll.manage"],
  },
  {
    key: "createSchedule",
    href: "/admin/scheduling/new",
    permissions: ["schedule.create"],
  },
  {
    key: "addProduct",
    href: "/admin/products/new",
    permissions: ["products.create"],
  },
  {
    key: "receiveInventory",
    href: "/admin/inventory",
    permissions: ["inventory.adjust"],
  },
  { key: "openPOS", href: "/admin/pos", permissions: ["pos.access"] },
];

export default async function AdminDashboardPage() {
  await requirePermission("reports.sales");

  const [mediaAssets, currentPermissions] = await Promise.all([
    getMediaAssets(),
    getCurrentStaffPermissions(),
  ]);
  const mediaCount = mediaAssets.length;
  const allowedQuickActions = quickActions.filter((action) =>
    hasPermission(currentPermissions ?? [], action.permissions),
  );

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
      <AdminQuickActions actions={allowedQuickActions} />
      <AdminDashboardStats mediaCount={mediaCount} />
    </AdminShell>
  );
}
