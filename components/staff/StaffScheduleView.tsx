"use client";

import type { StaffShift, StaffTimeOffRequest } from "@/lib/types/scheduling";
import type { StaffSession } from "@/lib/staff/staffSession";
import { formatTimeForDisplay } from "@/lib/utils/schedulingTime";

type StaffScheduleViewProps = {
  session: StaffSession;
  shifts: StaffShift[];
  timeOffRequests: StaffTimeOffRequest[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function StaffScheduleView({
  session,
  shifts,
  timeOffRequests,
}: StaffScheduleViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = shifts
    .filter((shift) => shift.shift_date >= today && shift.status !== "cancelled")
    .sort((a, b) => `${a.shift_date}${a.start_time}`.localeCompare(`${b.shift_date}${b.start_time}`));
  const todaysShift = upcoming.find((shift) => shift.shift_date === today);
  const nextShift = upcoming.find((shift) => shift.id !== todaysShift?.id);

  return (
    <div className="min-h-screen bg-[#0f0b07] px-5 py-8 text-[#f7ead2] sm:px-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            My Schedule
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">
            {session.displayName}
          </h1>
          <p className="mt-3 text-sm text-[#e8dcc8]/60">
            Published schedules appear here when assigned.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {[
            ["Today’s Shift", todaysShift],
            ["Next Shift", nextShift],
          ].map(([label, shift]) => (
            <article key={label as string} className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                {label as string}
              </p>
              {shift ? (
                <>
                  <p className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
                    {formatDate((shift as StaffShift).shift_date)}
                  </p>
                  <p className="mt-2 text-sm text-[#e8dcc8]/70">
                    {formatTimeForDisplay((shift as StaffShift).start_time)} - {formatTimeForDisplay((shift as StaffShift).end_time)}
                  </p>
                  <p className="mt-2 text-xs text-[#e8dcc8]/50">
                    {(shift as StaffShift).location_name ?? "Location pending"} / Break {(shift as StaffShift).unpaid_break_minutes}m
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-[#e8dcc8]/60">No Shift Scheduled</p>
              )}
            </article>
          ))}
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <h2 className="font-serif text-3xl font-semibold">Weekly Schedule</h2>
          <div className="mt-5 grid gap-3">
            {upcoming.map((shift) => (
              <article key={shift.id} className="border border-[#d8a344]/20 bg-[#0f0b07] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-[#f7ead2]">{formatDate(shift.shift_date)}</p>
                  <p className="text-sm text-[#d8a344]">{shift.status}</p>
                </div>
                <p className="mt-2 text-sm text-[#e8dcc8]/70">
                  {formatTimeForDisplay(shift.start_time)} - {formatTimeForDisplay(shift.end_time)}
                </p>
                <p className="mt-2 text-xs text-[#e8dcc8]/50">
                  {shift.location_name ?? "Location pending"} {shift.notes ? `/ ${shift.notes}` : ""}
                </p>
              </article>
            ))}
            {upcoming.length === 0 ? <p className="text-sm text-[#e8dcc8]/58">No published shifts found.</p> : null}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Approved Time Off
          </p>
          <div className="mt-4 space-y-2">
            {timeOffRequests
              .filter((request) => request.status === "approved")
              .map((request) => (
                <p key={request.id} className="text-sm text-[#e8dcc8]/62">
                  {request.request_type}: {request.start_date} - {request.end_date}
                </p>
              ))}
            {timeOffRequests.filter((request) => request.status === "approved").length === 0 ? (
              <p className="text-sm text-[#e8dcc8]/58">No approved time off in this view.</p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
