import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ShippingOriginForm from "@/components/admin/ShippingOriginForm";

export default function NewShippingOriginPage() {
  return (
    <AdminShell
      title="New Shipping Origin"
      description="Create a ship-from origin for future shipment snapshots."
    >
      <div className="mb-6">
        <Link
          href="/admin/settings/shipping-origins"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Origins
        </Link>
      </div>
      <ShippingOriginForm />
    </AdminShell>
  );
}
