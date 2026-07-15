import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ShippingOriginsManager from "@/components/admin/ShippingOriginsManager";
import { getShippingOrigins } from "@/lib/data/shippingOriginsRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function ShippingOriginsPage() {
  await requirePermission("shipping.origins.manage");

  const origins = await getShippingOrigins();

  return (
    <AdminShell
      title="Shipping Origins"
      description="Manage ship-from origins used for ASHE TOKUN fulfillment snapshots."
    >
      <div className="mb-6">
        <Link
          href="/admin/settings"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Settings
        </Link>
      </div>
      <ShippingOriginsManager origins={origins} />
    </AdminShell>
  );
}
