"use client";

import { useMemo, useState, useTransition } from "react";
import { setStaffAvailability } from "@/lib/data/schedulingMutations";
import type { StaffAvailability } from "@/lib/types/scheduling";
import type { StaffMember } from "@/lib/types/staff";
import { normalizeTimeInputValue } from "@/lib/utils/schedulingTime";

type StaffAvailabilityManagerProps = {
  staff: StaffMember[];
  availability: StaffAvailability[];
  selfStaffId?: string;
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inputClass =
  "min-h-10 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70";

export default function StaffAvailabilityManager({
  staff,
  availability,
  selfStaffId,
}: StaffAvailabilityManagerProps) {
  const [selectedStaffId, setSelectedStaffId] = useState(selfStaffId ?? staff[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const selectedAvailability = useMemo(
    () => availability.filter((item) => item.staff_member_id === selectedStaffId),
    [availability, selectedStaffId],
  );

  function handleSubmit(formData: FormData) {
    const availabilityPayload = weekdays.map((_, weekday) => ({
      weekday,
      available: formData.get(`available-${weekday}`) === "on",
      start_time: normalizeTimeInputValue(String(formData.get(`start-${weekday}`) ?? "")) || null,
      end_time: normalizeTimeInputValue(String(formData.get(`end-${weekday}`) ?? "")) || null,
      notes: String(formData.get(`notes-${weekday}`) ?? "") || null,
    }));

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

      <form action={handleSubmit} className="space-y-4 border border-[#f7ead2]/10 bg-[#120d08] p-5">
        {weekdays.map((day, weekday) => {
          const current = selectedAvailability.find((item) => item.weekday === weekday);
          return (
            <div key={day} className="grid gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] p-4 md:grid-cols-[1fr_auto_auto_auto_1.5fr] md:items-center">
              <p className="font-semibold text-[#f7ead2]">{day}</p>
              <label className="flex items-center gap-2 text-sm text-[#e8dcc8]/70">
                <input name={`available-${weekday}`} type="checkbox" defaultChecked={current?.available ?? true} />
                Available
              </label>
              <input name={`start-${weekday}`} type="time" defaultValue={normalizeTimeInputValue(current?.start_time)} className={inputClass} />
              <input name={`end-${weekday}`} type="time" defaultValue={normalizeTimeInputValue(current?.end_time)} className={inputClass} />
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
