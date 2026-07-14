"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addManualPunch } from "@/lib/data/timekeeperMutations";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";
import type { StaffMember } from "@/lib/types/staff";
import type { PunchType } from "@/lib/types/timekeeper";

type ManualPunchFormProps = {
  staff: StaffMember[];
  locations: InventoryLocation[];
};

const inputClass =
  "min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70";

const manualPunchTypes: Array<{ value: PunchType; label: string }> = [
  { value: "manual_in", label: "Manual Clock In" },
  { value: "manual_break_out", label: "Manual Break Out" },
  { value: "manual_break_in", label: "Manual Break In" },
  { value: "manual_out", label: "Manual Clock Out" },
];

function staffName(member: StaffMember) {
  return (
    member.display_name ||
    `${member.first_name} ${member.last_name}`.trim() ||
    member.employee_number
  );
}

export default function ManualPunchForm({ staff, locations }: ManualPunchFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    staff_member_id: "",
    work_date: "",
    punch_time: "",
    punch_type: "manual_in" as PunchType,
    location_id: "",
    reason: "",
    notes: "",
  });

  function submit() {
    if (!form.staff_member_id || !form.work_date || !form.punch_time || !form.reason.trim()) {
      setMessage("Employee, work date, punch time, and reason are required.");
      return;
    }

    const punchedAt = new Date(`${form.work_date}T${form.punch_time}:00`).toISOString();

    setMessage("Adding manual punch...");
    startTransition(async () => {
      const result = await addManualPunch({
        staff_member_id: form.staff_member_id,
        work_date: form.work_date,
        punch_type: form.punch_type,
        punched_at: punchedAt,
        location_id: form.location_id || null,
        reason: form.reason,
        notes: form.notes,
      });

      if (result.ok) {
        setMessage(result.message ?? "Manual punch added.");
        setForm((current) => ({
          ...current,
          punch_time: "",
          reason: "",
          notes: "",
        }));
        router.refresh();
        return;
      }

      setMessage(result.error);
    });
  }

  return (
    <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
        Manual Punch Correction
      </p>
      <h2 className="mt-2 font-serif text-3xl font-semibold text-[#f7ead2]">
        Add Missed Punch
      </h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select
          value={form.staff_member_id}
          onChange={(event) => setForm({ ...form, staff_member_id: event.target.value })}
          className={inputClass}
        >
          <option value="">Select employee</option>
          {staff
            .filter((member) => member.active && member.employment_status === "active")
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.employee_number} / {staffName(member)}
              </option>
            ))}
        </select>
        <input
          type="date"
          value={form.work_date}
          onChange={(event) => setForm({ ...form, work_date: event.target.value })}
          className={inputClass}
        />
        <input
          type="time"
          value={form.punch_time}
          onChange={(event) => setForm({ ...form, punch_time: event.target.value })}
          className={inputClass}
        />
        <select
          value={form.punch_type}
          onChange={(event) => setForm({ ...form, punch_type: event.target.value as PunchType })}
          className={inputClass}
        >
          {manualPunchTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          value={form.location_id}
          onChange={(event) => setForm({ ...form, location_id: event.target.value })}
          className={inputClass}
        >
          <option value="">Location optional</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <input
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
          placeholder="Reason required"
          className={`${inputClass} md:col-span-2`}
        />
        <input
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          placeholder="Notes optional"
          className={inputClass}
        />
      </div>
      <button
        disabled={pending}
        onClick={submit}
        className="mt-4 min-h-11 border border-[#d8a344]/45 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-50"
      >
        Add Missed Punch
      </button>
      {message ? <p className="mt-4 text-sm text-[#e8dcc8]/70">{message}</p> : null}
    </section>
  );
}
