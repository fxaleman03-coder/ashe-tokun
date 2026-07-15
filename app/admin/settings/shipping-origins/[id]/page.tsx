import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ShippingOriginForm from "@/components/admin/ShippingOriginForm";
import { getShipments } from "@/lib/data/shippingRepository";
import { getShippingOriginById } from "@/lib/data/shippingOriginsRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type ShippingOriginDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShippingOriginDetailPage({
  params,
}: ShippingOriginDetailPageProps) {
  const { id } = await params;
  await requirePermission("shipping.origins.manage");

  const origin = await getShippingOriginById(id);

  if (!origin) {
    return (
      <AdminShell
        title="Shipping Origin Not Found"
        description="This shipping origin record is not available."
      >
        <Link
          href="/admin/settings/shipping-origins"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Origins
        </Link>
      </AdminShell>
    );
  }

  const shipments = await getShipments();
  const shipmentCount = shipments.filter(
    (shipment) => shipment.shipping_origin_id === origin.id,
  ).length;

  return (
    <AdminShell
      title={origin.name}
      description="View, edit, activate, and set default shipping origin records."
    >
      <div className="mb-6">
        <Link
          href="/admin/settings/shipping-origins"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Origins
        </Link>
      </div>
      <ShippingOriginForm origin={origin} shipmentCount={shipmentCount} />
    </AdminShell>
  );
}
