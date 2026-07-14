"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  clockIn,
  clockOut,
  endBreak,
  startBreak,
  submitTimecard,
} from "@/lib/data/timekeeperMutations";
import type { StaffSession } from "@/lib/staff/staffSession";
import type { StaffShift } from "@/lib/types/scheduling";
import type {
  DailyPunchState,
  StaffPunch,
  StaffTimecard,
  StaffTimecardException,
} from "@/lib/types/timekeeper";
import {
  formatPunchType,
  formatWorkedDuration,
} from "@/lib/timekeeper/timekeeperHelpers";
import { formatDate, formatDateTime } from "@/lib/utils/dateTimeDisplay";
import { formatTimeForDisplay } from "@/lib/utils/schedulingTime";

type StaffTimekeeperProps = {
  session: StaffSession;
  today: string;
  timecard: StaffTimecard | null;
  punches: StaffPunch[];
  exceptions: StaffTimecardException[];
  shift: StaffShift | null;
  punchState: DailyPunchState;
};

const buttonClass =
  "min-h-11 border border-[#d8a344]/45 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-45";

export default function StaffTimekeeper({
  session,
  today,
  timecard,
  punches,
  exceptions,
  shift,
  punchState,
}: StaffTimekeeperProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const workedMinutes = timecard ? timecard.regular_minutes + timecard.overtime_minutes : 0;
  const canSubmit = Boolean(timecard && timecard.status !== "approved" && punches.length > 0);

  function runAction(label: string, action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setMessage(`${label}...`);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? result.message ?? `${label} complete.` : result.error ?? `${label} failed.`);
      if (result.ok) router.refresh();
    });
  }

  function submitCurrentTimecard() {
    if (!timecard) return;
    runAction("Submitting timecard", () => submitTimecard({ timecardId: timecard.id }));
  }

  return (
    <div className="min-h-screen bg-[#0f0b07] px-5 py-8 text-[#f7ead2] sm:px-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Timekeeper
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-semibold">{session.displayName}</h1>
              <p className="mt-3 text-sm text-[#e8dcc8]/60">
                {formatDate(today)} / {punchState.status.replaceAll("_", " ")}
              </p>
            </div>
            <Link
              href="/staff/timekeeper/history"
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
            >
              Timecard History
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Today&apos;s Shift
            </p>
            {shift ? (
              <>
                <p className="mt-3 font-serif text-2xl font-semibold">
                  {formatTimeForDisplay(shift.start_time)} - {formatTimeForDisplay(shift.end_time)}
                </p>
                <p className="mt-2 text-sm text-[#e8dcc8]/58">
                  {shift.location_name ?? "Location pending"} / Break {shift.unpaid_break_minutes} min
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-[#e8dcc8]/60">No published shift found for today.</p>
            )}
          </article>
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Worked Today
            </p>
            <p className="mt-3 font-serif text-2xl font-semibold">
              {formatWorkedDuration(workedMinutes)}
            </p>
            <p className="mt-2 text-sm text-[#e8dcc8]/58">
              Break time: {formatWorkedDuration(timecard?.unpaid_break_minutes ?? 0)}
            </p>
          </article>
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Timecard
            </p>
            <p className="mt-3 font-serif text-2xl font-semibold">
              {timecard?.status.replaceAll("_", " ") ?? "Not started"}
            </p>
            <p className="mt-2 text-sm text-[#e8dcc8]/58">
              {exceptions.filter((exception) => exception.status === "open").length} open exceptions
            </p>
          </article>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <div className="flex flex-wrap gap-3">
            <button
              disabled={pending || punchState.expectedNextPunchType !== "clock_in"}
              onClick={() => runAction("Clocking in", () => clockIn())}
              className={buttonClass}
            >
              Clock In
            </button>
            <button
              disabled={pending || punchState.expectedNextPunchType !== "break_out"}
              onClick={() => runAction("Starting break", () => startBreak())}
              className={buttonClass}
            >
              Start Break
            </button>
            <button
              disabled={pending || punchState.expectedNextPunchType !== "break_in"}
              onClick={() => runAction("Ending break", () => endBreak())}
              className={buttonClass}
            >
              End Break
            </button>
            <button
              disabled={pending || punchState.expectedNextPunchType !== "break_out"}
              onClick={() => runAction("Clocking out", () => clockOut())}
              className={buttonClass}
            >
              Clock Out
            </button>
            <button
              disabled={pending || !canSubmit}
              onClick={submitCurrentTimecard}
              className="min-h-11 border border-[#f7ead2]/12 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] disabled:opacity-45"
            >
              Submit Timecard
            </button>
          </div>
          {message ? <p className="mt-4 text-sm text-[#e8dcc8]/70">{message}</p> : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
            <h2 className="font-serif text-2xl font-semibold">Punch History</h2>
            <div className="mt-4 space-y-3">
              {punches.map((punch) => (
                <div key={punch.id} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-3">
                  <p className="text-sm font-semibold text-[#f7ead2]">
                    {formatPunchType(punch.punch_type)}
                  </p>
                  <p className="mt-1 text-xs text-[#e8dcc8]/58">
                    {punch.punchedAt ? formatDateTime(punch.punchedAt) : "Invalid punch timestamp"} /{" "}
                    {punch.source.replaceAll("_", " ")}
                  </p>
                </div>
              ))}
              {punches.length === 0 ? (
                <p className="text-sm text-[#e8dcc8]/58">No punches recorded today.</p>
              ) : null}
            </div>
          </article>
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
            <h2 className="font-serif text-2xl font-semibold">Exceptions</h2>
            <div className="mt-4 space-y-3">
              {exceptions.map((exception) => (
                <div key={exception.id} className="border border-[#d8a344]/20 bg-[#0f0b07] p-3">
                  <p className="text-sm font-semibold text-[#f7ead2]">
                    {exception.exception_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-[#e8dcc8]/58">
                    {exception.description}
                  </p>
                </div>
              ))}
              {exceptions.length === 0 ? (
                <p className="text-sm text-[#e8dcc8]/58">No exceptions recorded today.</p>
              ) : null}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
