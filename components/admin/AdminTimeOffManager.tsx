"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveTimeOffRequest,
  denyTimeOffRequest,
} from "@/lib/data/schedulingMutations";
import type { StaffTimeOffRequest, TimeOffStatus } from "@/lib/types/scheduling";

type AdminTimeOffManagerProps = {
  requests: StaffTimeOffRequest[];
  requestsError?: string;
};

function employeeName(request: StaffTimeOffRequest) {
  const staff = request.staff_member;
  return staff
    ? `${staff.employee_number} / ${staff.display_name || `${staff.first_name} ${staff.last_name}`}`
    : request.staff_member_id;
}

export default function AdminTimeOffManager({
  requests,
  requestsError,
}: AdminTimeOffManagerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"all" | TimeOffStatus>("pending");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const filteredRequests = useMemo(
    () => requests.filter((request) => status === "all" || request.status === status),
    [requests, status],
  );

  function review(id: string, action: "approve" | "deny") {
    const notes = window.prompt("Review notes optional.") ?? "";
    setPendingId(id);
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveTimeOffRequest(id, notes)
          : await denyTimeOffRequest(id, notes);
      setPendingId(null);
      setMessage(result.ok ? `Request ${action}d.` : result.error ?? "Request review failed.");
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344]">
              Time Off
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#f7ead2]">
              Requests
            </h2>
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | TimeOffStatus)}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2]"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {message ? <p className="mt-4 text-sm text-[#e8dcc8]/70">{message}</p> : null}
        {requestsError ? (
          <p className="mt-4 border border-red-300/30 bg-red-950/20 p-3 text-sm text-red-100">
            {requestsError}
          </p>
        ) : null}
      </section>

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08]">
        <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
          <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
            <tr>
              <th className="px-4 py-4">Employee</th>
              <th className="px-4 py-4">Type</th>
              <th className="px-4 py-4">Dates</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Reason</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7ead2]/10">
            {filteredRequests.map((request) => (
              <tr key={request.id}>
                <td className="px-4 py-4 text-[#f7ead2]">{employeeName(request)}</td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">{request.request_type}</td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">
                  {request.start_date} - {request.end_date}
                </td>
                <td className="px-4 py-4 text-[#e8dcc8]/72">{request.status}</td>
                <td className="px-4 py-4 text-[#e8dcc8]/60">{request.reason ?? "Pending"}</td>
                <td className="px-4 py-4">
                  {request.status === "pending" ? (
                    <div className="flex gap-2">
                      <button disabled={isPending && pendingId === request.id} onClick={() => review(request.id, "approve")} className="border border-[#d8a344]/45 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                        Approve
                      </button>
                      <button disabled={isPending && pendingId === request.id} onClick={() => review(request.id, "deny")} className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70">
                        Deny
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#e8dcc8]/50">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}
            {!requestsError && filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#e8dcc8]/58">
                  No time-off requests found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
