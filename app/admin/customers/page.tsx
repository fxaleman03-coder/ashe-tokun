import AdminCustomersManager from "@/components/admin/AdminCustomersManager";
import AdminShell from "@/components/admin/AdminShell";
import {
  getCustomerMetrics,
  getCustomers,
} from "@/lib/data/customersRepository";

export default async function AdminCustomersPage() {
  const [customers, metrics] = await Promise.all([
    getCustomers(),
    getCustomerMetrics(),
  ]);

  return (
    <AdminShell
      title="Customers"
      description="Manage customer records, purchase history, contact information, and POS customer assignment."
    >
      <AdminCustomersManager customers={customers} metrics={metrics} />
    </AdminShell>
  );
}
