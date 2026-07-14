"use client";

import Link from "next/link";
import ManualPunchForm from "@/components/admin/ManualPunchForm";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";
import type { StaffMember } from "@/lib/types/staff";
import type {
  StaffTimecard,
  StaffTimecardException,
  TimecardMetrics,
} from "@/lib/types/timekeeper";
import { formatDate } from "@/lib/utils/dateTimeDisplay";
import { formatWorkedDuration } from "@/lib/timekeeper/timekeeperHelpers";

type AdminTimekeeperManagerProps = {
  timecards: StaffTimecard[];
  exceptions: StaffTimecardException[];
  metrics: TimecardMetrics;
  staff: StaffMember[];
  locations: InventoryLocation[];
  readError?: string | null;
};

function employeeName(timecard: StaffTimecard) {
  const staff = timecard.staff_member;

  return staff
    ? staff.display_name || `${staff.first_name} ${staff.last_name}`.trim()
    : `Employee ${timecard.staff_member_id.slice(0, 8)}`;
}

export default function AdminTimekeeperManager({
  timecards,
  exceptions,
  metrics,
  staff,
  locations,
  readError,
}: AdminTimekeeperManagerProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Clocked In Now", metrics.clockedInNow],
          ["Missing Clock-Out", metrics.missingClockOut],
          ["Pending Review", metrics.pendingReview],
          ["Open Exceptions", metrics.openExceptions],
          ["Approved Today", metrics.approvedToday],
          ["Unscheduled Work", metrics.unscheduledWork],
          ["Late Arrivals", metrics.lateArrivals],
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

      {readError ? (
        <section className="border border-[#d8a344]/35 bg-[#120d08] p-5 text-sm text-[#e8dcc8]/72">
          Timekeeper read warning: {readError}
        </section>
      ) : null}

      <ManualPunchForm staff={staff} locations={locations} />

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-2 border-b border-[#f7ead2]/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Timecard Queue
          </p>
          <h2 className="font-serif text-3xl font-semibold text-[#f7ead2]">
            Staff Timecards
          </h2>
        </div>
        <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
          <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
            <tr>
              <th className="px-4 py-4">Employee</th>
              <th className="px-4 py-4">Work Date</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Regular</th>
              <th className="px-4 py-4">Break</th>
              <th className="px-4 py-4">Exceptions</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7ead2]/10">
            {timecards.map((timecard) => (
              <tr key={timecard.id}>
                <td className="px-4 py-4">
                  <p className="font-semibold text-[#f7ead2]">{employeeName(timecard)}</p>
                  <p className="mt-1 text-xs text-[#e8dcc8]/55">
                    {timecard.staff_member?.employee_number ?? timecard.staff_member_id}
                  </p>
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">{formatDate(timecard.work_date)}</td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {timecard.status.replaceAll("_", " ")}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {formatWorkedDuration(timecard.regular_minutes)}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {formatWorkedDuration(timecard.unpaid_break_minutes)}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">{timecard.exception_count}</td>
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/timekeeper/${timecard.id}`}
                    className="border border-[#d8a344]/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {timecards.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#e8dcc8]/58">
                  No timecards found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
          Open Exceptions
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {exceptions.slice(0, 8).map((exception) => (
            <article key={exception.id} className="border border-[#d8a344]/20 bg-[#0f0b07] p-4">
              <p className="text-sm font-semibold text-[#f7ead2]">
                {exception.exception_type.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-xs text-[#e8dcc8]/58">
                {exception.description}
              </p>
            </article>
          ))}
          {exceptions.length === 0 ? (
            <p className="text-sm text-[#e8dcc8]/58">No open timekeeper exceptions.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
