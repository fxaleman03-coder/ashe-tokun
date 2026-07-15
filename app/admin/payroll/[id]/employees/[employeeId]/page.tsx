import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PayrollEmployeeDetail from "@/components/admin/PayrollEmployeeDetail";
import {
  getDailyTimecardDisplay,
  getPayrollEmployeeDetail,
  isUuidLike,
} from "@/lib/data/payrollRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type PayrollEmployeePageProps = {
  params: Promise<{ id: string; employeeId: string }>;
};

export const dynamic = "force-dynamic";

export default async function PayrollEmployeePage({
  params,
}: PayrollEmployeePageProps) {
  const { id, employeeId } = await params;
  await requirePermission("payroll.view");

  if (!isUuidLike(id) || !isUuidLike(employeeId)) notFound();

  const detail = await getPayrollEmployeeDetail(id, employeeId);

  if (!detail) notFound();

  const dailyTimecards = await Promise.all(
    detail.timecards.map(async (row) => {
      const display = await getDailyTimecardDisplay(row.timecard_id);

      return {
        timecardId: row.timecard_id,
        firstClockIn: display.firstClockIn,
        lastClockOut: display.lastClockOut,
      };
    }),
  );

  return (
    <AdminShell
      title="Employee Payroll"
      description="Review an employee's daily approved timecards inside a payroll period."
    >
      <PayrollEmployeeDetail detail={detail} dailyTimecards={dailyTimecards} />
    </AdminShell>
  );
}
