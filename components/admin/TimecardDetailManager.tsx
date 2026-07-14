"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveTimecard,
  recalculateTimecardForReview,
  reopenTimecard,
  resolveTimecardException,
} from "@/lib/data/timekeeperMutations";
import type {
  StaffPunch,
  StaffTimecard,
  StaffTimecardException,
} from "@/lib/types/timekeeper";
import {
  formatPunchType,
  formatWorkedDuration,
} from "@/lib/timekeeper/timekeeperHelpers";
import { formatDate, formatDateTime } from "@/lib/utils/dateTimeDisplay";

type TimecardDetailManagerProps = {
  timecard: StaffTimecard;
  punches: StaffPunch[];
  exceptions: StaffTimecardException[];
};

function employeeName(timecard: StaffTimecard) {
  const staff = timecard.staff_member;

  return staff
    ? staff.display_name || `${staff.first_name} ${staff.last_name}`.trim()
    : `Employee ${timecard.staff_member_id.slice(0, 8)}`;
}

export default function TimecardDetailManager({
  timecard,
  punches,
  exceptions,
}: TimecardDetailManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState(timecard.manager_notes ?? "");
  const [pending, startTransition] = useTransition();

  function runAction(label: string, action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setMessage(`${label}...`);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? result.message ?? `${label} complete.` : result.error ?? `${label} failed.`);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="no-print border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
          Timecard Review
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-[#f7ead2]">
              {employeeName(timecard)}
            </h2>
            <p className="mt-2 text-sm text-[#e8dcc8]/60">
              {timecard.staff_member?.employee_number ?? "Employee"} / {formatDate(timecard.work_date)} /{" "}
              {timecard.status.replaceAll("_", " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/api/admin/timekeeper/${timecard.id}/pdf`}
              target="_blank"
              aria-disabled={punches.length === 0}
              className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] aria-disabled:pointer-events-none aria-disabled:opacity-45"
            >
              Open Payroll PDF
            </Link>
          </div>
        </div>
      </section>

      <section className="no-print grid gap-4 md:grid-cols-4">
        {[
          ["Regular", formatWorkedDuration(timecard.regular_minutes)],
          ["Overtime", formatWorkedDuration(timecard.overtime_minutes)],
          ["Break", formatWorkedDuration(timecard.unpaid_break_minutes)],
          ["Exceptions", timecard.exception_count],
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

      <section className="no-print border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <h3 className="font-serif text-2xl font-semibold text-[#f7ead2]">Manager Review</h3>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Manager notes"
          className="mt-4 w-full border border-[#f7ead2]/10 bg-[#0f0b07] p-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            disabled={pending || timecard.status === "approved"}
            onClick={() =>
              runAction("Approving timecard", () =>
                approveTimecard({ timecardId: timecard.id, notes }),
              )
            }
            className="min-h-11 border border-[#d8a344]/45 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-45"
          >
            Approve Timecard
          </button>
          <button
            disabled={pending}
            onClick={() =>
              runAction("Recalculating timecard", () =>
                recalculateTimecardForReview(timecard.id),
              )
            }
            className="min-h-11 border border-[#f7ead2]/12 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] disabled:opacity-45"
          >
            Recalculate Timecard
          </button>
          <button
            disabled={pending}
            onClick={() =>
              runAction("Reopening timecard", () =>
                reopenTimecard({ timecardId: timecard.id, notes }),
              )
            }
            className="min-h-11 border border-[#f7ead2]/12 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] disabled:opacity-45"
          >
            Reopen Timecard
          </button>
        </div>
        {message ? <p className="mt-4 text-sm text-[#e8dcc8]/70">{message}</p> : null}
      </section>

      <section className="no-print overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08]">
        <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
          <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
            <tr>
              <th className="px-4 py-4">Punch</th>
              <th className="px-4 py-4">Time</th>
              <th className="px-4 py-4">Source</th>
              <th className="px-4 py-4">Correction</th>
              <th className="px-4 py-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7ead2]/10">
            {punches.map((punch) => (
              <tr key={punch.id}>
                <td className="px-4 py-4 font-semibold text-[#f7ead2]">
                  {formatPunchType(punch.punch_type)}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {punch.punchedAt ? formatDateTime(punch.punchedAt) : "Invalid punch timestamp"}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">{punch.source.replaceAll("_", " ")}</td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {punch.is_correction ? punch.correction_reason ?? "Correction" : "No"}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">{punch.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="no-print border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <h3 className="font-serif text-2xl font-semibold text-[#f7ead2]">Exceptions</h3>
        <div className="mt-4 grid gap-3">
          {exceptions.map((exception) => (
            <article key={exception.id} className="border border-[#d8a344]/20 bg-[#0f0b07] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#f7ead2]">
                    {exception.exception_type.replaceAll("_", " ")} / {exception.severity}
                  </p>
                  <p className="mt-1 text-xs text-[#e8dcc8]/58">{exception.description}</p>
                  {exception.resolved_at ? (
                    <p className="mt-1 text-xs text-[#e8dcc8]/45">
                      Resolved {formatDateTime(exception.resolved_at)}
                    </p>
                  ) : null}
                </div>
                {exception.status === "open" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={pending}
                      onClick={() =>
                        runAction("Resolving exception", () =>
                          resolveTimecardException({
                            exceptionId: exception.id,
                            status: "resolved",
                            notes,
                          }),
                        )
                      }
                      className="min-h-10 border border-[#d8a344]/45 px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-45"
                    >
                      Resolve
                    </button>
                    <button
                      disabled={pending}
                      onClick={() =>
                        runAction("Dismissing exception", () =>
                          resolveTimecardException({
                            exceptionId: exception.id,
                            status: "dismissed",
                            notes,
                          }),
                        )
                      }
                      className="min-h-10 border border-[#f7ead2]/12 px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] disabled:opacity-45"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <p className="text-xs uppercase tracking-[0.16em] text-[#e8dcc8]/50">
                    {exception.status}
                  </p>
                )}
              </div>
            </article>
          ))}
          {exceptions.length === 0 ? (
            <p className="text-sm text-[#e8dcc8]/58">No exceptions for this timecard.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
