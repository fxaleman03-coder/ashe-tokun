"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { copyPreviousWeekSchedule } from "@/lib/data/schedulingMutations";
import type {
  ScheduleMetrics,
  ScheduleStatus,
  StaffSchedulePeriod,
  StaffShift,
  StaffTimeOffRequest,
} from "@/lib/types/scheduling";
import { formatDate } from "@/lib/utils/dateTimeDisplay";

type AdminSchedulingManagerProps = {
  periods: StaffSchedulePeriod[];
  shifts: StaffShift[];
  timeOffRequests: StaffTimeOffRequest[];
  metrics: ScheduleMetrics;
};

const inputClass =
  "min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70";

export default function AdminSchedulingManager({
  periods,
  shifts,
  timeOffRequests,
  metrics,
}: AdminSchedulingManagerProps) {
  const [status, setStatus] = useState<"all" | ScheduleStatus>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const filteredPeriods = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return periods.filter(
      (period) =>
        (status === "all" || period.status === status) &&
        (!normalizedSearch ||
          [period.name, period.location_name, period.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch)),
    );
  }, [periods, search, status]);

  function copyPreviousWeek() {
    const sourceId = window.prompt("Source schedule ID to copy");
    const targetStartDate = window.prompt("New start date (YYYY-MM-DD)");

    if (!sourceId || !targetStartDate) return;

    setMessage("Copying previous week...");
    startTransition(async () => {
      const result = await copyPreviousWeekSchedule(sourceId, targetStartDate);
      if (result.ok) {
        setMessage("warning" in result && result.warning ? result.warning : "Schedule copied.");
        return;
      }
      setMessage(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Current Schedule", metrics.currentSchedule],
          ["Draft Schedules", metrics.draftSchedules],
          ["Published Schedules", metrics.publishedSchedules],
          ["Open Shifts", metrics.openShifts],
          ["Pending Time-Off Requests", metrics.pendingTimeOffRequests],
          ["Employees Scheduled This Week", metrics.employeesScheduledThisWeek],
          ["Uncovered Days", metrics.uncoveredDays],
        ].map(([label, value]) => (
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

      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              Staff Scheduling
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#f7ead2]">
              Schedule Periods
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/scheduling/new"
              className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
            >
              New Schedule
            </Link>
            <Link
              href="/admin/scheduling/availability"
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
            >
              Manage Availability
            </Link>
            <Link
              href="/admin/scheduling/time-off"
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
            >
              Review Time Off
            </Link>
            <button
              disabled={pending}
              onClick={copyPreviousWeek}
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] disabled:opacity-55"
            >
              Copy Previous Week
            </button>
          </div>
        </div>
        {message ? <p className="mt-4 text-sm text-[#e8dcc8]/70">{message}</p> : null}

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search schedule"
            className={`${inputClass} md:col-span-2`}
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | ScheduleStatus)}
            className={inputClass}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <Link
            href="/admin/scheduling"
            className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70"
          >
            View Current Week
          </Link>
        </div>
      </section>

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
          <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
            <tr>
              <th className="px-4 py-4">Schedule</th>
              <th className="px-4 py-4">Dates</th>
              <th className="px-4 py-4">Location</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Shifts</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7ead2]/10">
            {filteredPeriods.map((period) => (
              <tr key={period.id}>
                <td className="px-4 py-4">
                  <p className="font-semibold text-[#f7ead2]">{period.name}</p>
                  <p className="mt-1 text-xs text-[#e8dcc8]/55">
                    {period.notes ?? "No notes"}
                  </p>
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {formatDate(period.start_date)} - {formatDate(period.end_date)}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {period.location_name ?? "All locations"}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">{period.status}</td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {shifts.filter((shift) => shift.schedule_period_id === period.id).length}
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/scheduling/${period.id}`}
                    className="border border-[#d8a344]/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filteredPeriods.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#e8dcc8]/58">
                  No schedules found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Time-Off Queue
          </p>
          <p className="mt-3 text-sm text-[#e8dcc8]/62">
            {timeOffRequests.filter((request) => request.status === "pending").length} pending requests
          </p>
        </article>
        <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Known Limitations
          </p>
          <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
            Time clock, payroll, PTO balances, automatic swaps, and notifications remain deferred.
          </p>
        </article>
      </section>
    </div>
  );
}
