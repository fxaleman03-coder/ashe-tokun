import AdminShell from "@/components/admin/AdminShell";
import AdminOrdersManager from "@/components/admin/AdminOrdersManager";
import {
  getOrders,
  getOrderSummaryMetrics,
} from "@/lib/data/ordersRepository";

export default async function AdminOrdersPage() {
  const [orders, metrics] = await Promise.all([
    getOrders(),
    getOrderSummaryMetrics(),
  ]);

  return (
    <AdminShell
      title="Orders"
      description="Manage order statuses, payment visibility, notes, cancellation, and operational history."
    >
      <AdminOrdersManager orders={orders} metrics={metrics} />
    </AdminShell>
  );
}
