"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveSchedulePeriod,
  cancelShift,
  publishSchedulePeriod,
} from "@/lib/data/schedulingMutations";
import type {
  StaffScheduleEvent,
  StaffSchedulePeriod,
  StaffShift,
} from "@/lib/types/scheduling";
import {
  formatDateTime,
  formatShortDateWithWeekday,
} from "@/lib/utils/dateTimeDisplay";
import { formatTimeForDisplay } from "@/lib/utils/schedulingTime";

type WeeklyScheduleBoardProps = {
  period: StaffSchedulePeriod;
  shifts: StaffShift[];
  events: StaffScheduleEvent[];
};

function getDays(startDate: string, endDate: string) {
  const days: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function employeeName(shift: StaffShift) {
  const staff = shift.staff_member;

  return staff
    ? staff.display_name || `${staff.first_name} ${staff.last_name}`
    : `Employee ${shift.staff_member_id.slice(0, 8)}`;
}

function isVisibleShift(shift: StaffShift) {
  return shift.status !== "cancelled";
}

export default function WeeklyScheduleBoard({
  period,
  shifts,
  events,
}: WeeklyScheduleBoardProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const days = getDays(period.start_date, period.end_date);
  const activeShifts = shifts.filter(isVisibleShift);
  const employeeIds = Array.from(new Set(activeShifts.map((shift) => shift.staff_member_id)));
  const activeEmployeeCount = new Set(activeShifts.map((shift) => shift.staff_member_id)).size;
  const employees = employeeIds.map((id) => {
    const shift = activeShifts.find((item) => item.staff_member_id === id);
    return {
      id,
      label: shift ? `${shift.staff_member?.employee_number ?? ""} ${employeeName(shift)}` : id,
    };
  });

  function runAction(label: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setMessage(`${label}...`);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? `${label} complete.` : result.error ?? `${label} failed.`);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  function handleCancelShift(shift: StaffShift) {
    const reason = window.prompt("Cancellation reason required.");
    if (!reason) return;
    runAction("Cancelling shift", () => cancelShift(shift.id, reason));
  }

  function handlePublishSchedule() {
    if (activeShifts.length === 0) {
      setMessage("Add at least one shift before publishing.");
      return;
    }

    const confirmed = window.confirm(
      [
        "Publish this schedule?",
        `Employees: ${activeEmployeeCount}`,
        `Active shifts: ${activeShifts.length}`,
        `Date range: ${formatShortDateWithWeekday(period.start_date)} - ${formatShortDateWithWeekday(period.end_date)}`,
      ].join("\n"),
    );

    if (!confirmed) return;

    runAction("Publishing schedule", () => publishSchedulePeriod(period.id));
  }

  function handlePrintSchedule() {
    if (activeShifts.length === 0) {
      setMessage("There are no shifts to print.");
      return;
    }

    window.print();
  }

  return (
    <div className="space-y-6">
      <section className="no-print border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              {period.status}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#f7ead2]">
              {period.name}
            </h2>
            <p className="mt-2 text-sm text-[#e8dcc8]/58">
              {formatShortDateWithWeekday(period.start_date)} - {formatShortDateWithWeekday(period.end_date)} /{" "}
              {period.location_name ?? "All locations"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending || period.status === "archived"}
              onClick={handlePublishSchedule}
              className="min-h-10 border border-[#d8a344]/45 px-4 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-50"
            >
              Publish Schedule
            </button>
            <button
              disabled={pending || period.status === "archived"}
              onClick={() => runAction("Archiving schedule", () => archiveSchedulePeriod(period.id))}
              className="min-h-10 border border-[#f7ead2]/12 px-4 text-xs font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344] disabled:opacity-50"
            >
              Archive Schedule
            </button>
            <button
              disabled={activeShifts.length === 0}
              onClick={handlePrintSchedule}
              className="min-h-10 border border-[#f7ead2]/12 px-4 text-xs font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
            >
              Print Schedule
            </button>
          </div>
        </div>
        {message ? <p className="mt-4 text-sm text-[#e8dcc8]/70">{message}</p> : null}
      </section>

      <section className="no-print hidden overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] lg:block">
        <div className="min-w-[1100px]">
          <div className="grid grid-cols-[220px_repeat(7,minmax(130px,1fr))] border-b border-[#f7ead2]/10 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344]">
            <div className="p-3">Employee</div>
            {days.map((day) => (
              <div key={day} className="border-l border-[#f7ead2]/10 p-3">
                {formatShortDateWithWeekday(day)}
              </div>
            ))}
          </div>
          {employees.length === 0 ? (
            <p className="p-6 text-center text-sm text-[#e8dcc8]/58">No shifts scheduled.</p>
          ) : null}
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="grid grid-cols-[220px_repeat(7,minmax(130px,1fr))] border-b border-[#f7ead2]/10"
            >
              <div className="p-3 text-sm font-semibold text-[#f7ead2]">
                {employee.label}
              </div>
              {days.map((day) => (
                <div key={day} className="min-h-32 space-y-2 border-l border-[#f7ead2]/10 p-2">
                  {activeShifts
                    .filter((shift) => shift.staff_member_id === employee.id && shift.shift_date === day)
                    .map((shift) => (
                      <article key={shift.id} className="border border-[#d8a344]/25 bg-[#0f0b07] p-3">
                        <p className="font-semibold text-[#f7ead2]">
                          {formatTimeForDisplay(shift.start_time)} - {formatTimeForDisplay(shift.end_time)}
                        </p>
                        <p className="mt-1 text-xs text-[#e8dcc8]/55">
                          {shift.location_name ?? "Location pending"} / Break {shift.unpaid_break_minutes}m
                        </p>
                        {shift.role_label || shift.department_label ? (
                          <p className="mt-1 text-xs text-[#e8dcc8]/55">
                            {[shift.role_label, shift.department_label].filter(Boolean).join(" / ")}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-[#d8a344]">{shift.status}</p>
                        {shift.notes ? (
                          <p className="mt-2 text-xs leading-5 text-[#e8dcc8]/50">{shift.notes}</p>
                        ) : null}
                        <button
                          disabled={period.status === "archived"}
                          onClick={() => handleCancelShift(shift)}
                          className="mt-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#d8a344] disabled:opacity-40"
                        >
                          Cancel Shift
                        </button>
                      </article>
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="no-print space-y-4 lg:hidden">
        {days.map((day) => (
          <article key={day} className="border border-[#f7ead2]/10 bg-[#120d08] p-4">
            <h3 className="font-serif text-2xl font-semibold text-[#f7ead2]">
              {formatShortDateWithWeekday(day)}
            </h3>
            <div className="mt-4 space-y-3">
              {activeShifts.filter((shift) => shift.shift_date === day).map((shift) => (
                <div key={shift.id} className="border border-[#d8a344]/20 bg-[#0f0b07] p-3">
                  <p className="font-semibold text-[#f7ead2]">{employeeName(shift)}</p>
                  <p className="mt-1 text-sm text-[#e8dcc8]/62">
                    {formatTimeForDisplay(shift.start_time)} - {formatTimeForDisplay(shift.end_time)}
                  </p>
                  {shift.role_label || shift.department_label || shift.notes ? (
                    <p className="mt-1 text-xs leading-5 text-[#e8dcc8]/50">
                      {[shift.role_label, shift.department_label, shift.notes]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="no-print border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
          Audit Events
        </p>
        <div className="mt-4 space-y-2">
          {events.slice(0, 8).map((event) => (
            <p key={event.id} className="text-sm text-[#e8dcc8]/62">
              {event.event_type} / {formatDateTime(event.created_at)}
            </p>
          ))}
          {events.length === 0 ? <p className="text-sm text-[#e8dcc8]/58">No schedule events yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
