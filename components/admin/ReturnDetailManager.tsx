"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  addReturnNote,
  approveReturn,
  cancelReturn,
  completeReturn,
  receiveReturn,
} from "@/lib/data/returnMutations";
import type {
  ReturnCondition,
  ReturnItem,
  ReturnRecord,
  ReturnTimelineEvent,
} from "@/lib/types/return";
import { launchContainment } from "@/lib/launchContainment";

type ReturnDetailManagerProps = {
  returnRecord: ReturnRecord;
  items: ReturnItem[];
  timeline: ReturnTimelineEvent[];
};

const inputClass =
  "min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";
const conditions: ReturnCondition[] = [
  "unopened",
  "sellable",
  "opened",
  "damaged",
  "defective",
  "missing_parts",
  "other",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ReturnDetailManager({
  returnRecord,
  items,
  timeline,
}: ReturnDetailManagerProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const containmentLabels = t.admin.launchContainment;
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "card" | "store_credit" | "other">(
    returnRecord.return_type === "store_credit" ? "store_credit" : "cash",
  );
  const [working, setWorking] = useState(false);
  const [receiveState, setReceiveState] = useState(
    Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          quantity: String(item.quantity),
          condition: (item.condition ?? "sellable") as ReturnCondition,
          restock: ["unopened", "sellable"].includes(item.condition ?? "sellable"),
          notes: "",
        },
      ]),
    ),
  );

  async function runAction(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setWorking(true);
    const result = await action();
    setWorking(false);
    setMessage(result.ok ? result.message ?? "Updated." : result.error ?? "Action failed.");

    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <section className="border border-[#d8a344]/20 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              Return Header
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold text-[#f7ead2]">
              {returnRecord.return_number}
            </h1>
            <p className="mt-3 text-sm text-[#e8dcc8]/62">
              {returnRecord.customer_name} /{" "}
              {returnRecord.return_type.replace("_", " ")} / {returnRecord.status}
            </p>
          </div>
          <div className="grid gap-3 text-sm text-[#e8dcc8]/72 sm:grid-cols-2">
            {[
              ["Original Order", returnRecord.order_number ?? "Pending"],
              ["Customer", returnRecord.customer_name],
              ["Type", returnRecord.return_type.replace("_", " ")],
              ["Status", returnRecord.status],
              ["Created", new Date(returnRecord.created_at).toLocaleString()],
              ["Value", formatCurrency(returnRecord.refund_total)],
            ].map(([label, value]) => (
              <div key={label} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                  {label}
                </p>
                <p className="mt-2 capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/returns"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Returns
        </Link>
        {returnRecord.order_id ? (
          <Link
            href={`/admin/orders/${returnRecord.order_id}`}
            className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
          >
            View Original Order
          </Link>
        ) : null}
        {returnRecord.status === "requested" ? (
          <button
            type="button"
            disabled={working}
            onClick={() => runAction(() => approveReturn(returnRecord.id))}
            className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:opacity-50"
          >
            Approve
          </button>
        ) : null}
        {["requested", "approved"].includes(returnRecord.status) ? (
          <button
            type="button"
            disabled={working}
            onClick={() => {
              const reason = window.prompt("Cancellation reason required.");

              if (reason) {
                runAction(() => cancelReturn(returnRecord.id, reason));
              }
            }}
            className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:opacity-50"
          >
            Cancel Return
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}

      <DetailCard title="Returned Items">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="text-[0.66rem] uppercase tracking-[0.18em] text-[#d8a344]">
              <tr>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Qty</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3">Condition</th>
                <th className="px-3 py-3">Restock</th>
                <th className="px-3 py-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72"
                >
                  <td className="px-3 py-3 text-[#f7ead2]">{item.product_name}</td>
                  <td className="px-3 py-3">{item.sku ?? "Pending"}</td>
                  <td className="px-3 py-3">{item.quantity}</td>
                  <td className="px-3 py-3">{item.reason ?? "Pending"}</td>
                  <td className="px-3 py-3">
                    {returnRecord.status === "approved" ? (
                      <select
                        value={receiveState[item.id]?.condition ?? "sellable"}
                        onChange={(event) =>
                          setReceiveState((current) => ({
                            ...current,
                            [item.id]: {
                              ...current[item.id],
                              condition: event.target.value as ReturnCondition,
                            },
                          }))
                        }
                        className={inputClass}
                      >
                        {conditions.map((condition) => (
                          <option key={condition} value={condition}>
                            {condition}
                          </option>
                        ))}
                      </select>
                    ) : (
                      item.condition ?? "Pending"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {returnRecord.status === "approved" ? (
                      <input
                        type="checkbox"
                        checked={receiveState[item.id]?.restock ?? false}
                        onChange={(event) =>
                          setReceiveState((current) => ({
                            ...current,
                            [item.id]: {
                              ...current[item.id],
                              restock: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 accent-[#d8a344]"
                      />
                    ) : (
                      item.condition &&
                      ["unopened", "sellable"].includes(item.condition)
                        ? "Eligible"
                        : "No"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {formatCurrency(item.refund_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>

      {returnRecord.status === "approved" ? (
        <DetailCard title="Receive Items">
          <button
            type="button"
            disabled={working}
            onClick={() =>
              runAction(() =>
                receiveReturn(
                  returnRecord.id,
                  items.map((item) => ({
                    return_item_id: item.id,
                    quantity_received: item.quantity,
                    condition: receiveState[item.id]?.condition ?? "sellable",
                    restock: receiveState[item.id]?.restock ?? false,
                    notes: receiveState[item.id]?.notes,
                  })),
                ),
              )
            }
            className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 disabled:opacity-50"
          >
            Receive Return Items
          </button>
        </DetailCard>
      ) : null}

      {returnRecord.status === "received" ? (
        <DetailCard title="Complete Return">
          {launchContainment.returnCompletion ? (
            <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#e8dcc8]/72">
              {containmentLabels.returnCompletion}
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <label>
                  <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                    Method
                  </span>
                  <select
                    value={refundMethod}
                    onChange={(event) =>
                      setRefundMethod(event.target.value as typeof refundMethod)
                    }
                    className={`${inputClass} mt-2`}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="store_credit">Store Credit</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <div className="md:col-span-2">
                  <p className="text-sm leading-6 text-[#e8dcc8]/62">
                    Card refunds are administrative only. Process card money
                    manually through the payment provider before marking the return
                    complete.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={working}
                onClick={() =>
                  runAction(() =>
                    completeReturn(returnRecord.id, {
                      refund:
                        returnRecord.return_type === "refund"
                          ? {
                              refund_method: refundMethod,
                              amount: returnRecord.refund_total,
                            }
                          : undefined,
                      storeCredit:
                        returnRecord.return_type === "store_credit"
                          ? { amount: returnRecord.refund_total }
                          : undefined,
                      exchange:
                        returnRecord.return_type === "exchange"
                          ? {
                              returned_value: returnRecord.refund_total,
                              replacement_value: returnRecord.refund_total,
                              price_difference: 0,
                              notes:
                                "Exchange replacement details are tracked administratively in this phase.",
                            }
                          : undefined,
                      restockItems: items.map((item) => ({
                        return_item_id: item.id,
                        condition: item.condition ?? "sellable",
                        restock:
                          item.condition !== null &&
                          ["unopened", "sellable"].includes(item.condition),
                      })),
                      notes: "Completed from ASHE TOKUN Control Center.",
                    }),
                  )
                }
                className="mt-5 inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 disabled:opacity-50"
              >
                Complete Return
              </button>
            </>
          )}
        </DetailCard>
      ) : null}

      <DetailCard title="Refund / Credit">
        <div className="grid gap-3 text-sm text-[#e8dcc8]/72 md:grid-cols-3">
          <p>
            <span className="text-[#d8a344]">Method:</span>{" "}
            {returnRecord.return_type === "store_credit"
              ? "Store Credit"
              : returnRecord.return_type === "exchange"
                ? "Exchange"
                : "Manual Refund"}
          </p>
          <p>
            <span className="text-[#d8a344]">Amount:</span>{" "}
            {formatCurrency(returnRecord.refund_total)}
          </p>
          <p>
            <span className="text-[#d8a344]">Status:</span>{" "}
            {returnRecord.status}
          </p>
        </div>
      </DetailCard>

      <DetailCard title="Timeline">
        <div className="space-y-3">
          {timeline.map((event) => (
            <div
              key={event.id}
              className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/72"
            >
              <p className="font-medium text-[#f7ead2]">{event.label}</p>
              <p className="mt-2">{event.description}</p>
              <p className="mt-2 text-xs text-[#d8a344]">
                {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </DetailCard>

      <DetailCard title="Notes">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            runAction(() => addReturnNote(returnRecord.id, note));
            setNote("");
          }}
          className="space-y-3"
        >
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Add return note"
            className={`${inputClass} py-3`}
          />
          <button
            type="submit"
            disabled={working}
            className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-50"
          >
            Add Note
          </button>
        </form>
      </DetailCard>
    </div>
  );
}
