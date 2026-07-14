import Link from "next/link";
import type { PayrollEmployeeSummary } from "@/lib/types/payroll";
import { formatWorkedDuration } from "@/lib/timekeeper/timekeeperHelpers";

type PayrollEmployeeTableProps = {
  employees: PayrollEmployeeSummary[];
  periodId: string;
  hasGeneratedRows: boolean;
};

function formatPayrollHours(minutes: number) {
  return `${formatWorkedDuration(minutes)} / ${(minutes / 60).toFixed(2)} hrs`;
}

export default function PayrollEmployeeTable({
  employees,
  periodId,
  hasGeneratedRows,
}: PayrollEmployeeTableProps) {
  return (
    <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <div className="border-b border-[#f7ead2]/10 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
          Employee Payroll Table
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold text-[#f7ead2]">
          Approved Hours by Employee
        </h2>
      </div>
      <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
        <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
          <tr>
            <th className="px-4 py-4">Employee #</th>
            <th className="px-4 py-4">Employee Name</th>
            <th className="px-4 py-4">Business Title</th>
            <th className="px-4 py-4">Regular Hours</th>
            <th className="px-4 py-4">Overtime Hours</th>
            <th className="px-4 py-4">Total Hours</th>
            <th className="px-4 py-4">Approval Status</th>
            <th className="px-4 py-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f7ead2]/10">
          {employees.map((employee) => {
            const firstTimecard = employee.timecards[0];

            return (
              <tr key={employee.staff_member_id}>
                <td className="px-4 py-4 text-[#e8dcc8]/72">{employee.employee_number}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-[#f7ead2]">{employee.employee_name}</p>
                  <p className="mt-1 text-xs text-[#e8dcc8]/50">
                    {employee.location_name ?? "Location pending"}
                  </p>
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {employee.business_title ?? "Not assigned"}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {formatPayrollHours(employee.regular_minutes)}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {formatPayrollHours(employee.overtime_minutes)}
                </td>
                <td className="px-4 py-4 text-[#f7ead2]">
                  {formatPayrollHours(employee.total_minutes)}
                </td>
                <td className="px-4 py-4 capitalize text-[#e8dcc8]/72">
                  {employee.approval_status}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {hasGeneratedRows && employee.period_employee_id ? (
                      <Link
                        href={`/admin/payroll/${periodId}/employees/${employee.period_employee_id}`}
                        className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
                      >
                        View
                      </Link>
                    ) : firstTimecard ? (
                      <>
                        <Link
                          href={`/admin/timekeeper/${firstTimecard.id}`}
                          className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
                        >
                          View
                        </Link>
                        <Link
                          href={`/api/admin/timekeeper/${firstTimecard.id}/pdf`}
                          target="_blank"
                          className="border border-[#d8a344]/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
                        >
                          Payroll PDF
                        </Link>
                      </>
                    ) : (
                      <span className="text-xs text-[#e8dcc8]/45">No approved timecard</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {employees.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-[#e8dcc8]/58">
                No approved payroll timecards found for this period.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
