"use client";

import Link from "next/link";
import PayrollActionButton from "@/components/admin/PayrollActionButton";
import {
  approvePayrollEmployee,
  excludePayrollEmployee,
  reviewPayrollEmployee,
} from "@/lib/data/payrollMutations";
import type { PayrollEmployeeDetail as PayrollEmployeeDetailData } from "@/lib/types/payroll";
import { formatWorkedDuration } from "@/lib/timekeeper/timekeeperHelpers";
import { formatDate, formatDateTime } from "@/lib/utils/dateTimeDisplay";

type PayrollEmployeeDetailProps = {
  detail: PayrollEmployeeDetailData;
  dailyTimecards: Array<{
    timecardId: string;
    firstClockIn: string | null;
    lastClockOut: string | null;
  }>;
};

function employeeName(detail: PayrollEmployeeDetailData) {
  const staff = detail.employee.staff_member;

  if (!staff) return `Employee ${detail.employee.staff_member_id.slice(0, 8)}`;

  return (
    staff.display_name ||
    `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() ||
    staff.employee_number
  );
}

function hours(minutes: number) {
  return `${formatWorkedDuration(minutes)} / ${(minutes / 60).toFixed(2)} hrs`;
}

export default function PayrollEmployeeDetail({
  detail,
  dailyTimecards,
}: PayrollEmployeeDetailProps) {
  const employee = detail.employee;
  const staff = employee.staff_member;
  const clockByTimecardId = new Map(
    dailyTimecards.map((timecard) => [timecard.timecardId, timecard]),
  );

  return (
    <div className="space-y-6">
      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
          Employee Payroll
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-[#f7ead2]">
              {employeeName(detail)}
            </h2>
            <p className="mt-2 text-sm text-[#e8dcc8]/62">
              {staff?.employee_number ?? "Employee"} / {staff?.business_title ?? "Not assigned"}
            </p>
            <p className="mt-1 text-sm text-[#e8dcc8]/50">
              {detail.period.period_name} / {formatDate(detail.period.start_date)} -{" "}
              {formatDate(detail.period.end_date)} / {detail.period.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PayrollActionButton
              label="Review Employee Payroll"
              disabled={detail.period.status === "closed"}
              action={() => reviewPayrollEmployee(employee.id)}
            />
            <PayrollActionButton
              label="Approve Employee Payroll"
              disabled={
                detail.period.status === "closed" ||
                employee.incomplete_timecard_count > 0
              }
              variant="gold"
              action={() => approvePayrollEmployee(employee.id)}
            />
            <PayrollActionButton
              label="Exclude Employee"
              disabled={detail.period.status === "closed"}
              variant="danger"
              action={() =>
                excludePayrollEmployee(employee.id, window.prompt("Exclusion reason") ?? "")
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Regular Hours", hours(employee.regular_minutes)],
          ["Overtime Hours", hours(employee.overtime_minutes)],
          ["Total Hours to Pay", hours(employee.total_minutes)],
          ["Approved Timecards", employee.approved_timecard_count],
          ["Pending Timecards", employee.pending_timecard_count],
          ["Incomplete Timecards", employee.incomplete_timecard_count],
        ].map(([label, value]) => (
          <article key={label} className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08]">
        <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
          <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
            <tr>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">First Clock In</th>
              <th className="px-4 py-4">Last Clock Out</th>
              <th className="px-4 py-4">Regular</th>
              <th className="px-4 py-4">Overtime</th>
              <th className="px-4 py-4">Total</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7ead2]/10">
            {detail.timecards.map((row) => {
              const clocks = clockByTimecardId.get(row.timecard_id);

              return (
                <tr key={row.id}>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {formatDate(row.work_date)}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {clocks?.firstClockIn ? formatDateTime(clocks.firstClockIn) : "Pending"}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {clocks?.lastClockOut ? formatDateTime(clocks.lastClockOut) : "Pending"}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {hours(row.regular_minutes)}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {hours(row.overtime_minutes)}
                  </td>
                  <td className="px-4 py-4 text-[#f7ead2]">
                    {hours(row.total_minutes)}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {row.captured_timecard_status}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/timekeeper/${row.timecard_id}`}
                        className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
                      >
                        Open Timecard
                      </Link>
                      <Link
                        href={`/api/admin/timekeeper/${row.timecard_id}/pdf`}
                        target="_blank"
                        className="border border-[#d8a344]/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        Payroll PDF
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {detail.timecards.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#e8dcc8]/58">
                  No daily payroll timecards captured for this employee.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

