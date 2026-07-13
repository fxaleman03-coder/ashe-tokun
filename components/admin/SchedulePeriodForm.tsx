"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSchedulePeriod } from "@/lib/data/schedulingMutations";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";

type SchedulePeriodFormProps = {
  locations: InventoryLocation[];
};

const inputClass =
  "mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70";

function defaultEndDate(startDate: string) {
  const date = new Date(`${startDate}T00:00:00`);
  date.setDate(date.getDate() + 6);
  return date.toISOString().slice(0, 10);
}

export default function SchedulePeriodForm({ locations }: SchedulePeriodFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [message, setMessage] = useState("");

  function handleSubmit(formData: FormData) {
    const schedulePayload = {
      name: String(formData.get("name") ?? ""),
      start_date: String(formData.get("startDate") ?? ""),
      end_date: String(formData.get("endDate") ?? ""),
      location_id: String(formData.get("locationId") ?? "") || null,
      notes: String(formData.get("notes") ?? ""),
    };

    setMessage("Creating schedule...");
    startTransition(async () => {
      const result = await createSchedulePeriod(schedulePayload);

      if (result.ok) {
        router.push(`/admin/scheduling/${result.data.id}`);
        return;
      }

      setMessage(result.error);
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-6 border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Schedule Name
          </span>
          <input name="name" required className={inputClass} />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Location
          </span>
          <select name="locationId" className={inputClass}>
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Start Date
          </span>
          <input
            name="startDate"
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            End Date
          </span>
          <input
            name="endDate"
            type="date"
            required
            defaultValue={defaultEndDate(today)}
            min={startDate}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
          Notes
        </span>
        <textarea name="notes" rows={4} className={`${inputClass} py-3`} />
      </label>
      {message ? <p className="text-sm text-[#e8dcc8]/70">{message}</p> : null}
      <button
        disabled={pending}
        className="min-h-12 border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-55"
      >
        {pending ? "Creating..." : "Create Draft Schedule"}
      </button>
    </form>
  );
}
