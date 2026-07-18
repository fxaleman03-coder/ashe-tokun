import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { launchContainmentMessages } from "@/lib/launchContainment";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function NewShipmentPage() {
  await requirePermission("shipping.create");

  return (
    <AdminShell
      title="Create Shipment"
      description={launchContainmentMessages.shipmentCreation}
    >
      <div className="mb-6">
        <Link
          href="/admin/shipping"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Shipping
        </Link>
      </div>
      <p className="border border-[#d8a344]/30 bg-[#120d08] px-5 py-4 text-sm leading-6 text-[#e8dcc8]/72">
        {launchContainmentMessages.shipmentCreation}
      </p>
    </AdminShell>
  );
}
