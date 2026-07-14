"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPayrollPeriod } from "@/lib/data/payrollMutations";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";
import type { PayrollPeriodType } from "@/lib/types/payroll";

type PayrollPeriodFormProps = {
  locations: InventoryLocation[];
};

const inputClass =
  "mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70";

function defaultEndDate(startDate: string, periodType: PayrollPeriodType) {
  const date = new Date(`${startDate}T00:00:00`);
  const daysByType: Record<PayrollPeriodType, number> = {
    weekly: 6,
    bi_weekly: 13,
    semi_monthly: 14,
    monthly: 29,
  };
  date.setDate(date.getDate() + daysByType[periodType]);

  return date.toISOString().slice(0, 10);
}

function defaultPayDate(endDate: string) {
  const date = new Date(`${endDate}T00:00:00`);
  date.setDate(date.getDate() + 5);

  return date.toISOString().slice(0, 10);
}

export default function PayrollPeriodForm({ locations }: PayrollPeriodFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const [periodType, setPeriodType] = useState<PayrollPeriodType>("weekly");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate(today, "weekly"));
  const [payDate, setPayDate] = useState(defaultPayDate(defaultEndDate(today, "weekly")));
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [payDateTouched, setPayDateTouched] = useState(false);
  const [message, setMessage] = useState("");

  function handlePeriodTypeChange(value: PayrollPeriodType) {
    const nextEndDate = defaultEndDate(startDate, value);
    setPeriodType(value);

    if (!endDateTouched) {
      setEndDate(nextEndDate);
      if (!payDateTouched) setPayDate(defaultPayDate(nextEndDate));
    }
  }

  function handleStartDateChange(value: string) {
    const nextEndDate = defaultEndDate(value, periodType);
    setStartDate(value);

    if (!endDateTouched) {
      setEndDate(nextEndDate);
      if (!payDateTouched) setPayDate(defaultPayDate(nextEndDate));
    }
  }

  function handleEndDateChange(value: string) {
    setEndDateTouched(true);
    setEndDate(value);
    if (!payDateTouched) setPayDate(defaultPayDate(value));
  }

  function handleSubmit(formData: FormData) {
    const submittedPeriodType = String(formData.get("periodType") ?? "") as PayrollPeriodType;
    const submittedLocationId = String(formData.get("locationId") ?? "") || null;
    const payload = {
      period_name: String(formData.get("periodName") ?? ""),
      period_type: submittedPeriodType || periodType,
      start_date: startDate,
      end_date: endDate,
      pay_date: payDate || null,
      location_id: submittedLocationId,
      notes: String(formData.get("notes") ?? "") || null,
    };

    setMessage(
      `Creating payroll period for ${payload.start_date} through ${payload.end_date}...`,
    );
    startTransition(async () => {
      const result = await createPayrollPeriod(payload);

      if (result.success && result.periodId) {
        router.push(`/admin/payroll/${result.periodId}`);
        return;
      }

      setMessage(result.error ?? "Unable to create payroll period.");
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
            Period Name
          </span>
          <input
            name="periodName"
            required
            placeholder="Weekly Payroll - Jul 12, 2026"
            className={inputClass}
          />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Period Type
          </span>
          <select
            name="periodType"
            value={periodType}
            onChange={(event) =>
              handlePeriodTypeChange(event.target.value as PayrollPeriodType)
            }
            className={inputClass}
          >
            <option value="weekly">Weekly</option>
            <option value="bi_weekly">Bi-weekly</option>
            <option value="semi_monthly">Semi-monthly</option>
            <option value="monthly">Monthly</option>
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
            onChange={(event) => handleStartDateChange(event.target.value)}
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
            value={endDate}
            min={startDate}
            onChange={(event) => handleEndDateChange(event.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Pay Date
          </span>
          <input
            name="payDate"
            type="date"
            value={payDate}
            min={endDate}
            onChange={(event) => {
              setPayDateTouched(true);
              setPayDate(event.target.value);
            }}
            className={inputClass}
          />
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
        {pending ? "Creating..." : "Create Payroll Period"}
      </button>
    </form>
  );
}
