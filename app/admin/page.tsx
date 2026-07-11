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
      <AdminDashboardStats mediaCount={mediaCount} />
    </AdminShell>
  );
}
