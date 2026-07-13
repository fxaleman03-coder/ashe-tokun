"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShift } from "@/lib/data/schedulingMutations";
import {
  formatTimeForDisplay,
  normalizeTimeInputValue,
  timeInputValueToMinutes,
} from "@/lib/utils/schedulingTime";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";
import type { StaffMember } from "@/lib/types/staff";

type ShiftFormProps = {
  schedulePeriodId: string;
  periodStart: string;
  periodEnd: string;
  locations: InventoryLocation[];
  staff: StaffMember[];
};

const inputClass =
  "mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70";

export default function ShiftForm({
  schedulePeriodId,
  periodStart,
  periodEnd,
  locations,
  staff,
}: ShiftFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("17:00");
  const [timeError, setTimeError] = useState("");
  const [pending, startTransition] = useTransition();
  const activeStaff = staff.filter(
    (member) => member.active && member.employment_status === "active",
  );

  function handleSubmit(formData: FormData) {
    if (!schedulePeriodId) {
      const error = "Unable to add shift: schedule period is missing.";
      setFieldErrors({ schedule_period_id: error });
      setMessage(error);
      return;
    }

    const normalizedStartTime = normalizeTimeInputValue(startTime);
    const normalizedEndTime = normalizeTimeInputValue(endTime);
    const startMinutes = timeInputValueToMinutes(normalizedStartTime);
    const endMinutes = timeInputValueToMinutes(normalizedEndTime);

    if (!normalizedStartTime || !normalizedEndTime) {
      const error = "Start time and end time must use HH:mm format.";
      setFieldErrors({ start_time: error, end_time: error });
      setTimeError(error);
      return;
    }
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      const error = "End time must be after start time.";
      setFieldErrors({ end_time: error });
      setTimeError(error);
      return;
    }

    setTimeError("");
    setFieldErrors({});
    setMessage("Checking conflicts...");
    const shiftPayload = {
      schedule_period_id: schedulePeriodId,
      staff_member_id: String(formData.get("staffMemberId") ?? ""),
      location_id: String(formData.get("locationId") ?? "") || null,
      shift_date: String(formData.get("shiftDate") ?? ""),
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      unpaid_break_minutes: Number(formData.get("breakMinutes") ?? 0),
      role_label: String(formData.get("roleLabel") ?? ""),
      department_label: String(formData.get("departmentLabel") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      allowAvailabilityOverride: formData.get("allowOverride") === "on",
    };

    startTransition(async () => {
      try {
        const result = await createShift(shiftPayload);

        if (result.ok) {
          formRef.current?.reset();
          setStartTime("08:30");
          setEndTime("17:00");
          setFieldErrors({});
          setMessage(
            result.warning
              ? `Shift added successfully. ${result.warning}`
              : "Shift added successfully.",
          );
          router.refresh();
          return;
        }

        setFieldErrors(result.fieldErrors ?? {});
        const conflictText = result.conflicts
          ?.map((conflict) => conflict.message)
          .join(" ");
        setMessage(conflictText ? `${result.error} ${conflictText}` : result.error);
      } catch {
        setMessage("Shift could not be created. Refresh the page and try again.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="no-print space-y-4 border border-[#f7ead2]/10 bg-[#120d08] p-5"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Employee
          </span>
          <select name="staffMemberId" required className={inputClass}>
            <option value="">Select employee</option>
            {activeStaff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.employee_number} /{" "}
                {member.display_name || `${member.first_name} ${member.last_name}`}
              </option>
            ))}
          </select>
          {fieldErrors.staff_member_id ? (
            <span className="mt-1 block text-xs text-[#d8a344]">
              {fieldErrors.staff_member_id}
            </span>
          ) : null}
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Date
          </span>
          <input
            name="shiftDate"
            type="date"
            required
            min={periodStart}
            max={periodEnd}
            defaultValue={periodStart}
            className={inputClass}
          />
          {fieldErrors.shift_date ? (
            <span className="mt-1 block text-xs text-[#d8a344]">
              {fieldErrors.shift_date}
            </span>
          ) : null}
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Location
          </span>
          <select name="locationId" className={inputClass}>
            <option value="">Schedule location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Start Time
          </span>
          <input
            name="startTime"
            type="time"
            required
            value={startTime}
            onChange={(event) => setStartTime(normalizeTimeInputValue(event.target.value))}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-[#e8dcc8]/50">
            {formatTimeForDisplay(startTime)}
          </span>
          {fieldErrors.start_time ? (
            <span className="mt-1 block text-xs text-[#d8a344]">
              {fieldErrors.start_time}
            </span>
          ) : null}
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            End Time
          </span>
          <input
            name="endTime"
            type="time"
            required
            value={endTime}
            onChange={(event) => setEndTime(normalizeTimeInputValue(event.target.value))}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-[#e8dcc8]/50">
            {formatTimeForDisplay(endTime)}
          </span>
          {fieldErrors.end_time ? (
            <span className="mt-1 block text-xs text-[#d8a344]">
              {fieldErrors.end_time}
            </span>
          ) : null}
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Break Minutes
          </span>
          <input
            name="breakMinutes"
            type="number"
            min="0"
            defaultValue="0"
            className={inputClass}
          />
          {fieldErrors.unpaid_break_minutes ? (
            <span className="mt-1 block text-xs text-[#d8a344]">
              {fieldErrors.unpaid_break_minutes}
            </span>
          ) : null}
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Role Label
          </span>
          <input name="roleLabel" className={inputClass} />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Department Label
          </span>
          <input name="departmentLabel" placeholder="Retail Operations" className={inputClass} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
          Notes
        </span>
        <textarea name="notes" rows={3} className={`${inputClass} py-3`} />
      </label>
      <label className="flex items-center gap-3 text-sm text-[#e8dcc8]/70">
        <input name="allowOverride" type="checkbox" />
        Allow availability override when authorized
      </label>
      {timeError ? <p className="text-sm text-[#d8a344]">{timeError}</p> : null}
      {fieldErrors.schedule_period_id ? (
        <p className="text-sm text-[#d8a344]">{fieldErrors.schedule_period_id}</p>
      ) : null}
      {message ? <p className="text-sm text-[#e8dcc8]/70">{message}</p> : null}
      <button
        disabled={pending}
        className="min-h-11 border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-55"
      >
        {pending ? "Saving..." : "Add Shift"}
      </button>
    </form>
  );
}
