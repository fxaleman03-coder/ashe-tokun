"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelTimeOffRequest,
  submitTimeOffRequest,
} from "@/lib/data/schedulingMutations";
import type {
  StaffTimeOffRequest,
  TimeOffRequestType,
} from "@/lib/types/scheduling";
import {
  formatTimeForDisplay,
  normalizeTimeInputValue,
  timeInputValueToMinutes,
} from "@/lib/utils/schedulingTime";

type StaffTimeOffRequestFormProps = {
  staffMemberId: string;
  requests: StaffTimeOffRequest[];
  requestsError?: string;
};

const inputClass =
  "mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70";

export default function StaffTimeOffRequestForm({
  staffMemberId,
  requests,
  requestsError,
}: StaffTimeOffRequestFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [partialDay, setPartialDay] = useState(false);
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("17:30");
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const startDate = String(formData.get("startDate") ?? "");
    const endDate = String(formData.get("endDate") ?? "");
    const nextFieldErrors: Record<string, string> = {};
    let normalizedStartTime: string | null = null;
    let normalizedEndTime: string | null = null;

    if (!startDate) nextFieldErrors.start_date = "Start date is required.";
    if (!endDate) nextFieldErrors.end_date = "End date is required.";
    if (startDate && endDate && endDate < startDate) {
      nextFieldErrors.end_date = "End date must be after start date.";
    }

    if (partialDay) {
      if (startDate && endDate && startDate !== endDate) {
        nextFieldErrors.end_date = "Partial-day requests must start and end on the same date.";
      }

      normalizedStartTime = normalizeTimeInputValue(startTime);
      normalizedEndTime = normalizeTimeInputValue(endTime);

      if (!normalizedStartTime) nextFieldErrors.start_time = "Start time is required.";
      if (!normalizedEndTime) nextFieldErrors.end_time = "End time is required.";

      const startMinutes = timeInputValueToMinutes(normalizedStartTime);
      const endMinutes = timeInputValueToMinutes(normalizedEndTime);
      if (
        normalizedStartTime &&
        normalizedEndTime &&
        (startMinutes === null || endMinutes === null || endMinutes <= startMinutes)
      ) {
        nextFieldErrors.end_time = "End time must be after start time.";
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessage("Time-off request has missing or invalid fields.");
      return;
    }

    const requestPayload = {
      staff_member_id: staffMemberId,
      request_type: String(formData.get("requestType") ?? "personal") as TimeOffRequestType,
      start_date: startDate,
      end_date: endDate,
      partial_day: partialDay,
      start_time: partialDay ? normalizedStartTime : null,
      end_time: partialDay ? normalizedEndTime : null,
      reason: String(formData.get("reason") ?? "") || null,
    };

    setFieldErrors({});
    setMessage("Submitting request...");
    startTransition(async () => {
      const result = await submitTimeOffRequest(requestPayload);
      if (result.ok) {
        formRef.current?.reset();
        setPartialDay(false);
        setStartTime("08:30");
        setEndTime("17:30");
        setFieldErrors({});
        setMessage("Time-off request submitted.");
        router.refresh();
        return;
      }

      setFieldErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Time-off request failed.");
    });
  }

  function cancelRequest(id: string) {
    setMessage("Cancelling request...");
    startTransition(async () => {
      const result = await cancelTimeOffRequest(id);
      setMessage(result.ok ? "Request cancelled." : result.error ?? "Request could not be cancelled.");
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[#0f0b07] px-5 py-8 text-[#f7ead2] sm:px-8">
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Request Time Off
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Time Off</h1>
          <p className="mt-3 text-sm text-[#e8dcc8]/60">
            PTO balances and payroll calculations are not included in this phase.
          </p>
        </section>

        <form
          ref={formRef}
          action={handleSubmit}
          className="space-y-4 border border-[#f7ead2]/10 bg-[#120d08] p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                Type
              </span>
              <select name="requestType" className={inputClass}>
                {["vacation", "sick", "personal", "unpaid", "bereavement", "jury_duty", "other"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-3 text-sm text-[#e8dcc8]/70">
              <input
                name="partialDay"
                type="checkbox"
                checked={partialDay}
                onChange={(event) => setPartialDay(event.target.checked)}
              />
              Partial day
            </label>
            <label>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                Start Date
              </span>
              <input name="startDate" type="date" required className={inputClass} />
              {fieldErrors.start_date ? (
                <span className="mt-1 block text-xs text-red-300">{fieldErrors.start_date}</span>
              ) : null}
            </label>
            <label>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                End Date
              </span>
              <input name="endDate" type="date" required className={inputClass} />
              {fieldErrors.end_date ? (
                <span className="mt-1 block text-xs text-red-300">{fieldErrors.end_date}</span>
              ) : null}
            </label>
            {partialDay ? (
              <>
                <label>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                    Start Time
                  </span>
                  <input
                    name="startTime"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(normalizeTimeInputValue(event.target.value))}
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs text-[#e8dcc8]/50">
                    {formatTimeForDisplay(startTime)}
                  </span>
                  {fieldErrors.start_time ? (
                    <span className="mt-1 block text-xs text-red-300">{fieldErrors.start_time}</span>
                  ) : null}
                </label>
                <label>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                    End Time
                  </span>
                  <input
                    name="endTime"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(normalizeTimeInputValue(event.target.value))}
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs text-[#e8dcc8]/50">
                    {formatTimeForDisplay(endTime)}
                  </span>
                  {fieldErrors.end_time ? (
                    <span className="mt-1 block text-xs text-red-300">{fieldErrors.end_time}</span>
                  ) : null}
                </label>
              </>
            ) : (
              <div className="md:col-span-2 border border-[#f7ead2]/10 bg-[#0f0b07] p-3 text-sm text-[#e8dcc8]/60">
                Full-day requests do not require start or end times.
              </div>
            )}
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Reason
            </span>
            <textarea name="reason" rows={4} className={`${inputClass} py-3`} />
          </label>
          {message ? <p className="text-sm text-[#e8dcc8]/70">{message}</p> : null}
          <button disabled={pending} className="min-h-11 border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-55">
            Submit Request
          </button>
        </form>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <h2 className="font-serif text-3xl font-semibold">My Requests</h2>
          {requestsError ? (
            <p className="mt-4 border border-red-300/30 bg-red-950/20 p-3 text-sm text-red-100">
              {requestsError}
            </p>
          ) : null}
          <div className="mt-5 space-y-3">
            {requests.map((request) => (
              <article key={request.id} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-[#f7ead2]">
                    {request.request_type}: {request.start_date} - {request.end_date}
                  </p>
                  <p className="text-sm text-[#d8a344]">{request.status}</p>
                </div>
                {request.status === "pending" ? (
                  <button onClick={() => cancelRequest(request.id)} className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                    Cancel Request
                  </button>
                ) : null}
              </article>
            ))}
            {!requestsError && requests.length === 0 ? (
              <p className="text-sm text-[#e8dcc8]/58">No requests yet.</p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
