import AdminPayrollDashboard from "@/components/admin/AdminPayrollDashboard";
import AdminShell from "@/components/admin/AdminShell";
import { getPayrollDashboardData } from "@/lib/data/payrollRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export const dynamic = "force-dynamic";

export default async function AdminPayrollPage() {
  await requirePermission("payroll.view");

  const data = await getPayrollDashboardData();

  return (
    <AdminShell
      title="Payroll"
      description="Aggregate approved timecards into payroll periods and prepare future payroll exports."
    >
      <AdminPayrollDashboard data={data} />
    </AdminShell>
  );
}
