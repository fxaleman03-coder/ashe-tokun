import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import CustomerDetailManager from "@/components/admin/CustomerDetailManager";
import {
  getCustomerAddresses,
  getCustomerById,
  getCustomerOrders,
} from "@/lib/data/customersRepository";
import { getReturns } from "@/lib/data/returnsRepository";
import { getShipments } from "@/lib/data/shippingRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;
  await requirePermission("customers.read");

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

  const [addresses, orders, returns, shipments] = await Promise.all([
    getCustomerAddresses(customer.id),
    getCustomerOrders(customer.id),
    getReturns(),
    getShipments(),
  ]);

  return (
    <AdminShell
      title={customer.display_name}
      description="Review customer profile, addresses, purchase history, notes, and operational status."
    >
      <CustomerDetailManager
        customer={customer}
        addresses={addresses}
        orders={orders}
        returns={returns.filter(
          (returnRecord) => returnRecord.customer_id === customer.id,
        )}
        shipments={shipments.filter(
          (shipment) => shipment.customer_id === customer.id,
        )}
      />
    </AdminShell>
  );
}
