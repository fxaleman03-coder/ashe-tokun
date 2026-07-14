import AdminShell from "@/components/admin/AdminShell";
import PayrollPeriodForm from "@/components/admin/PayrollPeriodForm";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export const dynamic = "force-dynamic";

export default async function NewPayrollPeriodPage() {
  await requirePermission("payroll.manage");

  const locations = await getInventoryLocations();

  return (
    <AdminShell
      title="Create Payroll Period"
      description="Define the payroll date range before generating payroll data."
    >
      <PayrollPeriodForm locations={locations.filter((location) => location.active)} />
    </AdminShell>
  );
}

