import AdminShell from "@/components/admin/AdminShell";
import AdminOrdersPageContent from "@/components/admin/AdminOrdersPageContent";
import {
  getOrders,
  getOrderSummaryMetrics,
} from "@/lib/data/ordersRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminOrdersPage() {
  await requirePermission("orders.read");

  const [orders, metrics] = await Promise.all([
    getOrders(),
    getOrderSummaryMetrics(),
  ]);

  return (
    <AdminShell title="">
      <AdminOrdersPageContent orders={orders} metrics={metrics} />
    </AdminShell>
  );
}
