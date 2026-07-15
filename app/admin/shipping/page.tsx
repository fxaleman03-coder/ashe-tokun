import AdminShell from "@/components/admin/AdminShell";
import AdminShippingManager from "@/components/admin/AdminShippingManager";
import {
  getShipments,
  getShippingMetrics,
} from "@/lib/data/shippingRepository";
import { getShippingOrigins } from "@/lib/data/shippingOriginsRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminShippingPage() {
  await requirePermission("shipping.read");

  const [shipments, metrics, origins] = await Promise.all([
    getShipments(),
    getShippingMetrics(),
    getShippingOrigins(),
  ]);

  return (
    <AdminShell
      title="Shipping"
      description="Manage fulfillment status, shipment records, packages, tracking, and local pickup."
    >
      <AdminShippingManager shipments={shipments} metrics={metrics} origins={origins} />
    </AdminShell>
  );
}
