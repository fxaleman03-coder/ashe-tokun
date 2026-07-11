import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import CustomerForm from "@/components/admin/CustomerForm";

export default function NewCustomerPage() {
  return (
    <AdminShell
      title="New Customer"
      description="Create a registered, VIP, or wholesale customer record."
    >
      <div className="space-y-6">
        <Link
          href="/admin/customers"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Customers
        </Link>
        <CustomerForm mode="create" />
      </div>
    </AdminShell>
  );
}
