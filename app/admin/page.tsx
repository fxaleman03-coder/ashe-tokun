import AdminShell from "@/components/admin/AdminShell";
import AdminDashboardStats from "@/components/admin/AdminDashboardStats";
import { getProductMedia } from "@/lib/media";

export default function AdminDashboardPage() {
  const mediaCount = getProductMedia().length;

  return (
    <AdminShell
      title="Dashboard"
      description="Manage products, inventory, orders, and the future growth of ASHE TOKUN."
    >
      <AdminDashboardStats mediaCount={mediaCount} />
    </AdminShell>
  );
}
