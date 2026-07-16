import AdminShell from "@/components/admin/AdminShell";
import AdminDashboardPageContent from "@/components/admin/AdminDashboardPageContent";
import {
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
    <AdminShell title="">
      <AdminDashboardPageContent
        actions={allowedQuickActions}
        mediaCount={mediaCount}
      />
    </AdminShell>
  );
}
