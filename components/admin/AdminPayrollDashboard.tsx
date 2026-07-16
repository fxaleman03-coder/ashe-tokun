"use client";

import Link from "next/link";
import PayrollEmployeeTable from "@/components/admin/PayrollEmployeeTable";
import PayrollPeriodCard from "@/components/admin/PayrollPeriodCard";
import PayrollActionButton from "@/components/admin/PayrollActionButton";
import {
  approvePayrollPeriod,
  closePayrollPeriod,
  generatePayrollPeriod,
  reopenPayrollPeriod,
  refreshPayrollPeriod,
} from "@/lib/data/payrollMutations";
import type { PayrollDashboardData } from "@/lib/types/payroll";
import { formatWorkedDuration } from "@/lib/timekeeper/timekeeperHelpers";

type AdminPayrollDashboardProps = {
  data: PayrollDashboardData;
};

function formatPayrollHours(minutes: number) {
  return `${formatWorkedDuration(minutes)} / ${(minutes / 60).toFixed(2)} hrs`;
}

export default function AdminPayrollDashboard({ data }: AdminPayrollDashboardProps) {
  const isPersistedPeriod = data.hasPersistedPeriod;
  const needsPersistedPeriod = "Create or select a persisted payroll period first.";
  const allEmployeesFinalized =
    data.employees.length > 0 &&
    data.employees.every((employee) =>
      ["approved", "excluded"].includes(employee.approval_status),
    );
  const canApprovePeriod =
    isPersistedPeriod &&
    data.hasGeneratedRows &&
    data.currentPeriod.status === "processing" &&
    allEmployeesFinalized;
  const canClosePeriod =
    isPersistedPeriod &&
    data.currentPeriod.status === "approved";
  const canReopenPeriod =
    isPersistedPeriod &&
    ["approved", "closed"].includes(data.currentPeriod.status);
  const metricCards = [
    ["Employees", data.metrics.employee_count],
    ["Approved Timecards", data.metrics.approved_timecards],
    ["Pending Timecards", data.metrics.pending_timecards],
    ["Regular Hours", formatPayrollHours(data.metrics.regular_minutes)],
    ["Overtime Hours", formatPayrollHours(data.metrics.overtime_minutes)],
    ["Total Payroll Hours", formatPayrollHours(data.metrics.total_minutes)],
  ];

  return (
    <div className="space-y-6">
      <PayrollPeriodCard period={data.currentPeriod} />

      <section className="flex flex-col gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Payroll Period Setup
          </p>
          <p className="mt-2 text-sm text-[#e8dcc8]/62">
            Create a persisted payroll period before generating payroll rows or exports.
          </p>
        </div>
        <Link
          href="/admin/payroll/new"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Create Payroll Period
        </Link>
      </section>

      {data.readWarning ? (
        <section className="border border-[#d8a344]/35 bg-[#120d08] p-5 text-sm text-[#e8dcc8]/72">
          Payroll read warning: {data.readWarning}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map(([label, value]) => (
          <article
            key={label}
            className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
          >
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Generate Payroll
          </p>
          <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
            Build payroll employee rows and daily timecard snapshots from approved Timekeeper data.
          </p>
          <div className="mt-4">
            <PayrollActionButton
              label="Generate Payroll"
              pendingLabel="Generating..."
              variant="gold"
              disabled={!isPersistedPeriod || data.currentPeriod.status !== "draft"}
              disabledReason={
                !isPersistedPeriod
                  ? needsPersistedPeriod
                  : data.currentPeriod.status !== "draft"
                    ? "Generate Payroll is only available for draft periods."
                    : undefined
              }
              action={() => generatePayrollPeriod(data.currentPeriod.id)}
            />
          </div>
        </article>
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Refresh Payroll Data
          </p>
          <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
            Refresh processing or reopened payroll snapshots without changing source timecards.
          </p>
          <div className="mt-4">
            <PayrollActionButton
              label="Refresh Payroll Data"
              pendingLabel="Refreshing..."
              disabled={
                !isPersistedPeriod ||
                !["processing", "reopened"].includes(data.currentPeriod.status)
              }
              disabledReason={
                !isPersistedPeriod
                  ? needsPersistedPeriod
                  : !["processing", "reopened"].includes(data.currentPeriod.status)
                    ? "Refresh is available for processing or reopened periods."
                    : undefined
              }
              action={() => refreshPayrollPeriod(data.currentPeriod.id)}
            />
          </div>
        </article>
        {[
          ["Export CSV", "export/csv"],
          ["Export Excel", "export/xlsx"],
          ["Payroll Period PDF", "pdf"],
          ["Generate Payroll Package", "package"],
        ].map(([label, suffix]) => (
          <article key={label} className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
              Available after payroll rows have been generated.
            </p>
            {isPersistedPeriod && data.hasGeneratedRows ? (
              <a
                href={`/api/admin/payroll/${data.currentPeriod.id}/${suffix}`}
                target="_blank"
                className="mt-4 inline-flex min-h-11 items-center border border-[#f7ead2]/12 px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
              >
                Open
              </a>
            ) : (
              <span className="mt-4 inline-flex min-h-11 items-center border border-[#f7ead2]/12 px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/35">
                Open
              </span>
            )}
            {!isPersistedPeriod ? (
              <p className="mt-2 text-xs text-[#d8a344]/72">{needsPersistedPeriod}</p>
            ) : !data.hasGeneratedRows ? (
              <p className="mt-2 text-xs text-[#e8dcc8]/45">
                Generate payroll rows before exporting.
              </p>
            ) : null}
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Approve Payroll Period
          </p>
          <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
            Finalize a processing payroll period after every employee row is approved or excluded.
          </p>
          <div className="mt-4">
            <PayrollActionButton
              label="Approve Payroll Period"
              pendingLabel="Approving..."
              variant="gold"
              disabled={!canApprovePeriod}
              disabledReason={
                !isPersistedPeriod
                  ? needsPersistedPeriod
                  : !data.hasGeneratedRows
                    ? "Generate payroll rows before approving the period."
                    : data.currentPeriod.status !== "processing"
                      ? "Only processing payroll periods can be approved."
                      : data.employees.length === 0
                        ? "At least one employee row is required before approval."
                        : !allEmployeesFinalized
                          ? "Every employee must be approved or excluded before approving the period."
                          : undefined
              }
              action={() => approvePayrollPeriod(data.currentPeriod.id)}
            />
          </div>
        </article>
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Close Payroll Period
          </p>
          <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
            Close an approved payroll period after review and export preparation are complete.
          </p>
          <div className="mt-4">
            <PayrollActionButton
              label="Close Payroll Period"
              pendingLabel="Closing..."
              disabled={!canClosePeriod}
              disabledReason={
                !isPersistedPeriod
                  ? needsPersistedPeriod
                  : data.currentPeriod.status !== "approved"
                    ? "Only approved payroll periods can be closed."
                    : undefined
              }
              action={() => closePayrollPeriod(data.currentPeriod.id)}
            />
          </div>
        </article>
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Reopen Payroll Period
          </p>
          <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
            Reopen an approved or closed payroll period for authorized correction.
          </p>
          <div className="mt-4">
            <PayrollActionButton
              label="Reopen Payroll Period"
              pendingLabel="Reopening..."
              disabled={!canReopenPeriod}
              disabledReason={
                !isPersistedPeriod
                  ? needsPersistedPeriod
                  : !["approved", "closed"].includes(data.currentPeriod.status)
                    ? "Only approved or closed payroll periods can be reopened."
                    : undefined
              }
              action={() =>
                reopenPayrollPeriod(
                  data.currentPeriod.id,
                  "Reopened from payroll dashboard for authorized correction.",
                )
              }
            />
          </div>
        </article>
      </section>

      <section className="grid gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-5 text-sm text-[#e8dcc8]/62 md:grid-cols-5">
        {["Pay Period", "Employee", "Location", "Department", "Approval Status"].map((label) => (
          <div key={label} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-3">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]/72">
              Coming Soon
            </p>
            <p className="mt-1">{label}</p>
            <p className="mt-2 text-xs text-[#e8dcc8]/42">
              Filter control not enabled yet.
            </p>
          </div>
        ))}
      </section>

      <PayrollEmployeeTable
        employees={data.employees}
        periodId={data.currentPeriod.id}
        hasGeneratedRows={data.hasGeneratedRows}
      />
    </div>
  );
}
