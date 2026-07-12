"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  approveReturn,
  cancelReturn,
} from "@/lib/data/returnMutations";
import type {
  ReturnMetrics,
  ReturnRecord,
  ReturnStatus,
  ReturnType,
} from "@/lib/types/return";

type AdminReturnsManagerProps = {
  returns: ReturnRecord[];
  metrics: ReturnMetrics;
};

const inputClass =
  "min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function validActions(returnRecord: ReturnRecord) {
  return {
    approve: returnRecord.status === "requested",
    receive: returnRecord.status === "approved",
    complete: returnRecord.status === "received",
    cancel: ["requested", "approved"].includes(returnRecord.status),
  };
}

export default function AdminReturnsManager({
  returns,
  metrics,
}: AdminReturnsManagerProps) {
  const [search, setSearch] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [returnType, setReturnType] = useState<"all" | ReturnType>("all");
  const [returnStatus, setReturnStatus] = useState<"all" | ReturnStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [message, setMessage] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const filteredReturns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedOrder = orderNumber.trim().toLowerCase();
    const normalizedCustomer = customer.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;

    return returns.filter((returnRecord) => {
      const createdAt = new Date(returnRecord.created_at);
      const customerText = [
        returnRecord.customer_name,
        returnRecord.customer_contact,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedSearch ||
          returnRecord.return_number.toLowerCase().includes(normalizedSearch)) &&
        (!normalizedOrder ||
          returnRecord.order_number?.toLowerCase().includes(normalizedOrder)) &&
        (!normalizedCustomer || customerText.includes(normalizedCustomer)) &&
        (returnType === "all" || returnRecord.return_type === returnType) &&
        (returnStatus === "all" || returnRecord.status === returnStatus) &&
        (!from || createdAt >= from) &&
        (!to || createdAt <= to)
      );
    });
  }, [
    customer,
    dateFrom,
    dateTo,
    orderNumber,
    returnStatus,
    returnType,
    returns,
    search,
  ]);

  async function runAction(
    returnRecord: ReturnRecord,
    action: () => Promise<{ ok: boolean; message?: string; error?: string }>,
  ) {
    setWorkingId(returnRecord.id);
    const result = await action();
    setWorkingId(null);
    setMessage(result.ok ? result.message ?? "Updated." : result.error ?? "Action failed.");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total Returns", metrics.totalReturns],
          ["Requested", metrics.requestedReturns],
          ["Approved", metrics.approvedReturns],
          ["Received", metrics.receivedReturns],
          ["Completed", metrics.completedReturns],
          ["Cancelled", metrics.cancelledReturns],
          ["Total Refunded", formatCurrency(metrics.totalRefunded)],
          ["Exchanges", metrics.exchangeReturns],
          ["Store Credits", metrics.storeCreditReturns],
          ["Returned Units", metrics.totalReturnedUnits],
        ].map(([label, value]) => (
          <article
            key={label}
            className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
          >
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#e8dcc8]/58">
          Returns preserve original sale records and track refunds
          administratively only.
        </p>
        <Link
          href="/admin/returns/new"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 hover:shadow-[0_0_36px_rgba(216,163,68,0.24)]"
        >
          New Return
        </Link>
      </div>

      <div className="grid gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] md:grid-cols-2 xl:grid-cols-7">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Return number"
          className={inputClass}
        />
        <input
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="Order number"
          className={inputClass}
        />
        <input
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
          placeholder="Customer"
          className={inputClass}
        />
        <select
          value={returnType}
          onChange={(event) =>
            setReturnType(event.target.value as "all" | ReturnType)
          }
          className={inputClass}
        >
          <option value="all">Type</option>
          <option value="refund">Refund</option>
          <option value="exchange">Exchange</option>
          <option value="store_credit">Store Credit</option>
        </select>
        <select
          value={returnStatus}
          onChange={(event) =>
            setReturnStatus(event.target.value as "all" | ReturnStatus)
          }
          className={inputClass}
        >
          <option value="all">Status</option>
          {["requested", "approved", "received", "completed", "cancelled"].map(
            (status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ),
          )}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className={inputClass}
        />
      </div>

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">Return Number</th>
              <th className="px-5 py-4">Original Order</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Items</th>
              <th className="px-5 py-4">Value</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.length > 0 ? (
              filteredReturns.map((returnRecord) => {
                const actions = validActions(returnRecord);

                return (
                  <tr
                    key={returnRecord.id}
                    className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                  >
                    <td className="px-5 py-4 font-medium text-[#f7ead2]">
                      {returnRecord.return_number}
                    </td>
                    <td className="px-5 py-4">
                      {returnRecord.order_id ? (
                        <Link
                          href={`/admin/orders/${returnRecord.order_id}`}
                          className="text-[#d8a344] transition hover:text-[#f7ead2]"
                        >
                          {returnRecord.order_number}
                        </Link>
                      ) : (
                        "Pending"
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p>{returnRecord.customer_name}</p>
                      {returnRecord.customer_contact ? (
                        <p className="mt-1 text-xs text-[#e8dcc8]/50">
                          Primary Contact: {returnRecord.customer_contact}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 capitalize">
                      {returnRecord.return_type.replace("_", " ")}
                    </td>
                    <td className="px-5 py-4">{returnRecord.item_count}</td>
                    <td className="px-5 py-4">
                      {formatCurrency(returnRecord.refund_total)}
                    </td>
                    <td className="px-5 py-4">{returnRecord.status}</td>
                    <td className="px-5 py-4">
                      {new Date(returnRecord.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/returns/${returnRecord.id}`}
                          className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                        >
                          View
                        </Link>
                        {actions.approve ? (
                          <button
                            type="button"
                            disabled={workingId === returnRecord.id}
                            onClick={() =>
                              runAction(returnRecord, () =>
                                approveReturn(returnRecord.id),
                              )
                            }
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:opacity-50"
                          >
                            Approve
                          </button>
                        ) : null}
                        {actions.receive ? (
                          <Link
                            href={`/admin/returns/${returnRecord.id}`}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                          >
                            Receive
                          </Link>
                        ) : null}
                        {actions.complete ? (
                          <Link
                            href={`/admin/returns/${returnRecord.id}`}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                          >
                            Complete
                          </Link>
                        ) : null}
                        {actions.cancel ? (
                          <button
                            type="button"
                            disabled={workingId === returnRecord.id}
                            onClick={() => {
                              const reason = window.prompt(
                                "Cancellation reason required.",
                              );

                              if (reason) {
                                runAction(returnRecord, () =>
                                  cancelReturn(returnRecord.id, reason),
                                );
                              }
                            }}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-14 text-center text-sm text-[#e8dcc8]/54"
                >
                  No returns match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
