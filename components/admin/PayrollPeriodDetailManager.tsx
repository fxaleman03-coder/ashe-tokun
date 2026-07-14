"use client";

import Link from "next/link";
import PayrollActionButton from "@/components/admin/PayrollActionButton";
import {
  approvePayrollEmployee,
  approvePayrollPeriod,
  closePayrollPeriod,
  excludePayrollEmployee,
  generatePayrollPeriod,
  includePayrollEmployee,
  refreshPayrollPeriod,
  reopenPayrollPeriod,
  reviewPayrollEmployee,
} from "@/lib/data/payrollMutations";
import type { PayrollPeriodDetail } from "@/lib/types/payroll";
import { formatWorkedDuration } from "@/lib/timekeeper/timekeeperHelpers";
import { formatDate, formatDateTime } from "@/lib/utils/dateTimeDisplay";

type PayrollPeriodDetailManagerProps = {
  detail: PayrollPeriodDetail;
};

function employeeName(employee: PayrollPeriodDetail["employees"][number]) {
  const staff = employee.staff_member;

  if (!staff) return `Employee ${employee.staff_member_id.slice(0, 8)}`;

  return (
    staff.display_name ||
    `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() ||
    staff.employee_number
  );
}

function hours(minutes: number) {
  return `${formatWorkedDuration(minutes)} / ${(minutes / 60).toFixed(2)} hrs`;
}

export default function PayrollPeriodDetailManager({
  detail,
}: PayrollPeriodDetailManagerProps) {
  const period = detail.period;
  const hasRows = detail.employees.length > 0;

  return (
    <div className="space-y-6">
      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
          Payroll Period
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-[#f7ead2]">
              {period.period_name}
            </h2>
            <p className="mt-2 text-sm text-[#e8dcc8]/62">
              {period.period_type.replaceAll("_", " ")} / {formatDate(period.start_date)} -{" "}
              {formatDate(period.end_date)} / {period.status}
            </p>
            <p className="mt-1 text-sm text-[#e8dcc8]/50">
              Pay date: {formatDate(period.pay_date)} / Location:{" "}
              {period.location_name ?? "All locations"} / Notes: {period.notes ?? "None"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/admin/payroll/${period.id}/export/csv`}
              target="_blank"
              aria-disabled={!hasRows}
              className="inline-flex min-h-11 items-center border border-[#f7ead2]/12 px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              Export CSV
            </a>
            <a
              href={`/api/admin/payroll/${period.id}/export/xlsx`}
              target="_blank"
              aria-disabled={!hasRows}
              className="inline-flex min-h-11 items-center border border-[#f7ead2]/12 px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              Export Excel
            </a>
            <a
              href={`/api/admin/payroll/${period.id}/pdf`}
              target="_blank"
              aria-disabled={!hasRows}
              className="inline-flex min-h-11 items-center border border-[#f7ead2]/12 px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              Period PDF
            </a>
            <a
              href={`/api/admin/payroll/${period.id}/package`}
              target="_blank"
              aria-disabled={!hasRows}
              className="inline-flex min-h-11 items-center border border-[#d8a344]/35 px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              Payroll Package
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Employees", detail.metrics.employee_count],
          ["Ready", detail.metrics.ready_employees],
          ["Incomplete", detail.metrics.incomplete_employees],
          ["Reviewed", detail.metrics.reviewed_employees],
          ["Approved", detail.metrics.approved_employees],
          ["Regular Hours", hours(detail.metrics.regular_minutes)],
          ["Overtime Hours", hours(detail.metrics.overtime_minutes)],
          ["Total Hours", hours(detail.metrics.total_minutes)],
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

      <section className="grid gap-4 md:grid-cols-3">
        <PayrollActionButton
          label="Generate"
          disabled={period.status !== "draft"}
          variant="gold"
          action={() => generatePayrollPeriod(period.id)}
        />
        <PayrollActionButton
          label="Refresh"
          disabled={!["processing", "reopened"].includes(period.status)}
          action={() => refreshPayrollPeriod(period.id)}
        />
        <PayrollActionButton
          label="Approve Period"
          disabled={!hasRows || period.status === "closed"}
          variant="gold"
          action={() => approvePayrollPeriod(period.id)}
        />
        <PayrollActionButton
          label="Close Period"
          disabled={period.status !== "approved"}
          variant="danger"
          action={() => closePayrollPeriod(period.id)}
        />
        <PayrollActionButton
          label="Reopen Period"
          disabled={!["approved", "closed"].includes(period.status)}
          action={() => reopenPayrollPeriod(period.id, window.prompt("Reopen reason") ?? "")}
        />
      </section>

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08]">
        <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
          <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
            <tr>
              <th className="px-4 py-4">Employee #</th>
              <th className="px-4 py-4">Employee Name</th>
              <th className="px-4 py-4">Business Title</th>
              <th className="px-4 py-4">Regular</th>
              <th className="px-4 py-4">Overtime</th>
              <th className="px-4 py-4">Total</th>
              <th className="px-4 py-4">Timecards</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7ead2]/10">
            {detail.employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {employee.staff_member?.employee_number ?? "Pending"}
                </td>
                <td className="px-4 py-4 font-semibold text-[#f7ead2]">
                  {employeeName(employee)}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {employee.staff_member?.business_title ?? "Not assigned"}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {hours(employee.regular_minutes)}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {hours(employee.overtime_minutes)}
                </td>
                <td className="px-4 py-4 text-[#f7ead2]">
                  {hours(employee.total_minutes)}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {employee.approved_timecard_count} approved / {employee.pending_timecard_count} pending /{" "}
                  {employee.incomplete_timecard_count} incomplete
                </td>
                <td className="px-4 py-4 capitalize text-[#e8dcc8]/72">
                  {employee.status}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/payroll/${period.id}/employees/${employee.id}`}
                      className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
                    >
                      View
                    </Link>
                    <PayrollActionButton
                      label="Review"
                      disabled={period.status === "closed"}
                      action={() => reviewPayrollEmployee(employee.id)}
                    />
                    <PayrollActionButton
                      label="Approve"
                      disabled={period.status === "closed" || employee.incomplete_timecard_count > 0}
                      variant="gold"
                      action={() => approvePayrollEmployee(employee.id)}
                    />
                    {employee.status === "excluded" ? (
                      <PayrollActionButton
                        label="Include"
                        disabled={period.status === "closed"}
                        action={() => includePayrollEmployee(employee.id)}
                      />
                    ) : (
                      <PayrollActionButton
                        label="Exclude"
                        disabled={period.status === "closed"}
                        variant="danger"
                        action={() =>
                          excludePayrollEmployee(
                            employee.id,
                            window.prompt("Exclusion reason") ?? "",
                          )
                        }
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {detail.employees.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-[#e8dcc8]/58">
                  No payroll rows generated yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
          Payroll Activity
        </p>
        <div className="mt-4 grid gap-3">
          {detail.events.map((event) => (
            <article key={event.id} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
              <p className="text-sm font-semibold text-[#f7ead2]">
                {event.event_type.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-xs text-[#e8dcc8]/50">{formatDateTime(event.created_at)}</p>
            </article>
          ))}
          {detail.events.length === 0 ? (
            <p className="text-sm text-[#e8dcc8]/58">No payroll events yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
