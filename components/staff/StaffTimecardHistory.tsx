"use client";

import Link from "next/link";
import type { StaffSession } from "@/lib/staff/staffSession";
import type { StaffTimecard } from "@/lib/types/timekeeper";
import { formatDate } from "@/lib/utils/dateTimeDisplay";
import { formatWorkedDuration } from "@/lib/timekeeper/timekeeperHelpers";

type StaffTimecardHistoryProps = {
  session: StaffSession;
  timecards: StaffTimecard[];
};

export default function StaffTimecardHistory({
  session,
  timecards,
}: StaffTimecardHistoryProps) {
  return (
    <div className="min-h-screen bg-[#0f0b07] px-5 py-8 text-[#f7ead2] sm:px-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Timecard History
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-semibold">{session.displayName}</h1>
              <p className="mt-3 text-sm text-[#e8dcc8]/60">
                Review submitted and approved timecards.
              </p>
            </div>
            <Link
              href="/staff/timekeeper"
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
            >
              Back to Timekeeper
            </Link>
          </div>
        </section>

        <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08]">
          <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
            <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
              <tr>
                <th className="px-4 py-4">Date</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Regular</th>
                <th className="px-4 py-4">Break</th>
                <th className="px-4 py-4">Exceptions</th>
                <th className="px-4 py-4">Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7ead2]/10">
              {timecards.map((timecard) => (
                <tr key={timecard.id}>
                  <td className="px-4 py-4 font-semibold text-[#f7ead2]">
                    {formatDate(timecard.work_date)}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/70">
                    {timecard.status.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/70">
                    {formatWorkedDuration(timecard.regular_minutes)}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/70">
                    {formatWorkedDuration(timecard.unpaid_break_minutes)}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/70">
                    {timecard.exception_count}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/70">
                    {timecard.approved_at ? formatDate(timecard.approved_at) : "Pending"}
                  </td>
                </tr>
              ))}
              {timecards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#e8dcc8]/58">
                    No timecards found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
