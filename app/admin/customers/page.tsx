import AdminCustomersPageContent from "@/components/admin/AdminCustomersPageContent";
import AdminShell from "@/components/admin/AdminShell";
import {
  getCustomerMetrics,
  getCustomers,
} from "@/lib/data/customersRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminCustomersPage() {
  await requirePermission("customers.read");

  const [customers, metrics] = await Promise.all([
    getCustomers(),
    getCustomerMetrics(),
  ]);

  return (
    <AdminShell title="">
      <AdminCustomersPageContent customers={customers} metrics={metrics} />
    </AdminShell>
  );
}
