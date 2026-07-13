"use client";

import { useMemo, useState, useTransition } from "react";
import { setStaffAvailability } from "@/lib/data/schedulingMutations";
import type { StaffAvailability } from "@/lib/types/scheduling";
import type { StaffMember } from "@/lib/types/staff";
import {
  formatTimeForDisplay,
  normalizeTimeInputValue,
  timeInputValueToMinutes,
} from "@/lib/utils/schedulingTime";

type StaffAvailabilityManagerProps = {
  staff: StaffMember[];
  availability: StaffAvailability[];
  selfStaffId?: string;
  availabilityError?: string;
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inputClass =
  "min-h-10 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70";

export default function StaffAvailabilityManager({
  staff,
  availability,
  selfStaffId,
  availabilityError,
}: StaffAvailabilityManagerProps) {
  const [selectedStaffId, setSelectedStaffId] = useState(selfStaffId ?? staff[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const selectedAvailability = useMemo(
    () => availability.filter((item) => item.staff_member_id === selectedStaffId),
    [availability, selectedStaffId],
  );

  function handleSubmit(formData: FormData) {
    const errors: string[] = [];
    const availabilityPayload = weekdays.map((_, weekday) => {
      const available = formData.get(`available-${weekday}`) === "on";
      const startTime = available
        ? normalizeTimeInputValue(String(formData.get(`start-${weekday}`) ?? "")) || null
        : null;
      const endTime = available
        ? normalizeTimeInputValue(String(formData.get(`end-${weekday}`) ?? "")) || null
        : null;
      const effectiveFrom = String(formData.get(`effective-from-${weekday}`) ?? "") || null;
      const effectiveUntil = String(formData.get(`effective-until-${weekday}`) ?? "") || null;

      if (available && startTime && endTime) {
        const startMinutes = timeInputValueToMinutes(startTime);
        const endMinutes = timeInputValueToMinutes(endTime);
        if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
          errors.push(`${weekdays[weekday]} end time must be after start time.`);
        }
      }
      if (effectiveFrom && effectiveUntil && effectiveUntil < effectiveFrom) {
        errors.push(`${weekdays[weekday]} effective-until date must be after effective-from.`);
      }

      return {
        weekday,
        available,
        start_time: startTime,
        end_time: endTime,
        effective_from: effectiveFrom,
        effective_until: effectiveUntil,
        notes: String(formData.get(`notes-${weekday}`) ?? "") || null,
      };
    });

    if (errors.length > 0) {
      setMessage(errors.join(" "));
      return;
    }

    setMessage("Saving availability...");
    startTransition(async () => {
      const result = await setStaffAvailability(selectedStaffId, availabilityPayload);

      setMessage(result.ok ? "Availability saved." : result.error ?? "Availability could not be saved.");
    });
  }

  return (
    <div className="space-y-6">
      {!selfStaffId ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Employee
            </span>
            <select
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
              className={`mt-2 ${inputClass} w-full`}
            >
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.employee_number} / {member.display_name || `${member.first_name} ${member.last_name}`}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {availabilityError ? (
        <section className="border border-red-300/30 bg-red-950/20 p-4 text-sm text-red-100">
          {availabilityError}
        </section>
      ) : null}

      <form action={handleSubmit} className="space-y-4 border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <p className="text-xs leading-5 text-[#e8dcc8]/55">
          Weekday mapping: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
          4 = Thursday, 5 = Friday, 6 = Saturday. Leave times blank for all-day
          availability.
        </p>
        {weekdays.map((day, weekday) => {
          const current = selectedAvailability.find((item) => item.weekday === weekday);
          return (
            <div key={day} className="grid gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] p-4 md:grid-cols-[1fr_auto_auto_auto_1fr_1fr_1.5fr] md:items-center">
              <p className="font-semibold text-[#f7ead2]">{day}</p>
              <label className="flex items-center gap-2 text-sm text-[#e8dcc8]/70">
                <input name={`available-${weekday}`} type="checkbox" defaultChecked={current?.available ?? true} />
                Available
              </label>
              <label className="block">
                <span className="sr-only">{day} start time</span>
                <input name={`start-${weekday}`} type="time" defaultValue={normalizeTimeInputValue(current?.start_time)} className={inputClass} />
                {current?.start_time ? (
                  <span className="mt-1 block text-xs text-[#e8dcc8]/45">
                    {formatTimeForDisplay(current.start_time)}
                  </span>
                ) : null}
              </label>
              <label className="block">
                <span className="sr-only">{day} end time</span>
                <input name={`end-${weekday}`} type="time" defaultValue={normalizeTimeInputValue(current?.end_time)} className={inputClass} />
                {current?.end_time ? (
                  <span className="mt-1 block text-xs text-[#e8dcc8]/45">
                    {formatTimeForDisplay(current.end_time)}
                  </span>
                ) : null}
              </label>
              <input name={`effective-from-${weekday}`} type="date" defaultValue={current?.effective_from ?? ""} className={inputClass} />
              <input name={`effective-until-${weekday}`} type="date" defaultValue={current?.effective_until ?? ""} className={inputClass} />
              <input name={`notes-${weekday}`} placeholder="Notes" defaultValue={current?.notes ?? ""} className={inputClass} />
            </div>
          );
        })}
        {message ? <p className="text-sm text-[#e8dcc8]/70">{message}</p> : null}
        <button disabled={pending || !selectedStaffId} className="min-h-11 border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-55">
          {pending ? "Saving..." : "Save Availability"}
        </button>
      </form>
    </div>
  );
}
