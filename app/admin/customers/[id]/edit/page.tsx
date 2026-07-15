import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import CustomerForm from "@/components/admin/CustomerForm";
import { getCustomerById } from "@/lib/data/customersRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params;
  await requirePermission("customers.edit");

  const customer = await getCustomerById(id);

  if (!customer) {
    return (
      <AdminShell
        title="Customer Not Found"
        description="This customer record is not available."
      >
        <Link
          href="/admin/customers"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Customers
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={`Edit ${customer.display_name}`}
      description="Update contact information, customer type, notes, and active status."
    >
      <div className="space-y-6">
        <Link
          href={`/admin/customers/${customer.id}`}
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Customer
        </Link>
        <CustomerForm mode="edit" customer={customer} />
      </div>
    </AdminShell>
  );
}
