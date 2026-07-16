import AdminShell from "@/components/admin/AdminShell";
import AdminShippingPageContent from "@/components/admin/AdminShippingPageContent";
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
    <AdminShell title="">
      <AdminShippingPageContent
        shipments={shipments}
        metrics={metrics}
        origins={origins}
      />
    </AdminShell>
  );
}
