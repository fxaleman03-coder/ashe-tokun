import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ShipmentDetailManager from "@/components/admin/ShipmentDetailManager";
import {
  getShipmentAddresses,
  getShipmentById,
  getShipmentEvents,
  getShipmentItems,
  getShipmentPackages,
} from "@/lib/data/shippingRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type ShipmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShipmentDetailPage({
  params,
}: ShipmentDetailPageProps) {
  const { id } = await params;
  await requirePermission("shipping.read");

  const shipment = await getShipmentById(id);

  if (!shipment) {
    return (
      <AdminShell
        title="Shipment Not Found"
        description="This shipment record is not available."
      >
        <Link
          href="/admin/shipping"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Shipping
        </Link>
      </AdminShell>
    );
  }

  const [items, packages, addresses, events] = await Promise.all([
    getShipmentItems(shipment.id),
    getShipmentPackages(shipment.id),
    getShipmentAddresses(shipment.id),
    getShipmentEvents(shipment.id),
  ]);

  return (
    <AdminShell
      title={shipment.shipment_number}
      description="Manage shipment status, packages, address snapshots, tracking, events, and packing slip visibility."
    >
      <ShipmentDetailManager
        shipment={shipment}
        items={items}
        packages={packages}
        addresses={addresses}
        events={events}
      />
    </AdminShell>
  );
}
