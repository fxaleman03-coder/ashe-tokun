"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addOrderNote,
  cancelOrder,
  completeHeldOrder,
  holdOrder,
  updatePaymentStatus,
} from "@/lib/data/orderMutations";
import type {
  AdminOrderDetail,
  PaymentStatus,
} from "@/lib/data/ordersRepository";

type OrderDetailActionsProps = {
  order: AdminOrderDetail;
};

const inputClass =
  "min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:cursor-not-allowed disabled:border-[#f7ead2]/10 disabled:text-[#e8dcc8]/30";

function canHold(status: string) {
  return status === "draft";
}

function canCompleteHeld(order: AdminOrderDetail) {
  return order.order_status === "held";
}

function canCancel(status: string) {
  return ["draft", "held", "completed"].includes(status);
}

export default function OrderDetailActions({ order }: OrderDetailActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order.payment_status,
  );
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function runMutation(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setIsWorking(true);
    setMessage("Saving...");
    const result = await action();

    setIsWorking(false);

    if (!result.ok) {
      setMessage(result.error ?? "Action failed.");
      return;
    }

    setMessage(result.message ?? "Updated.");
    router.refresh();
  }

  async function handleAddNote() {
    await runMutation(() => addOrderNote(order.id, note));
    setNote("");
  }

  async function handlePaymentStatus() {
    await runMutation(() =>
      updatePaymentStatus(
        order.id,
        paymentStatus,
        "Payment status updates do not process or reverse real payments.",
      ),
    );
  }

  async function handleHold() {
    await runMutation(() => holdOrder(order.id, "Order held from Control Center."));
  }

  async function handleCompleteHeld() {
    await runMutation(() => completeHeldOrder(order.id));
  }

  async function handleCancel() {
    if (!cancelReason.trim() || !confirmCancel) {
      setMessage("Cancellation reason and explicit confirmation are required.");
      return;
    }

    await runMutation(() => cancelOrder(order.id, cancelReason));
    setIsCancelOpen(false);
    setCancelReason("");
    setConfirmCancel(false);
  }

  return (
    <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
        Actions
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
        Payment status updates do not process or reverse real payments.
      </p>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="space-y-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Add Note
          </p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={`${inputClass} min-h-24 py-3`}
            placeholder="Operational note"
          />
          <button
            type="button"
            onClick={handleAddNote}
            disabled={isWorking || !note.trim()}
            className={buttonClass}
          >
            Add Note
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Payment Status
          </p>
          <select
            value={paymentStatus}
            onChange={(event) =>
              setPaymentStatus(event.target.value as PaymentStatus)
            }
            className={inputClass}
          >
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="partially_paid">partially_paid</option>
          </select>
          <button
            type="button"
            onClick={handlePaymentStatus}
            disabled={isWorking || paymentStatus === order.payment_status}
            className={buttonClass}
          >
            Update Payment
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Order Status
          </p>
          <div className="flex flex-wrap gap-3">
            {canHold(order.order_status) ? (
              <button
                type="button"
                onClick={handleHold}
                disabled={isWorking}
                className={buttonClass}
              >
                Hold Order
              </button>
            ) : null}
            {canCompleteHeld(order) ? (
              <button
                type="button"
                onClick={handleCompleteHeld}
                disabled={isWorking}
                className={buttonClass}
              >
                Complete Held
              </button>
            ) : null}
            {canCancel(order.order_status) ? (
              <button
                type="button"
                onClick={() => setIsCancelOpen(true)}
                disabled={isWorking}
                className={buttonClass}
              >
                Cancel Order
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-5 border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}

      {isCancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050302]/80 px-4">
          <div className="w-full max-w-xl border border-[#d8a344]/35 bg-[#120d08] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
            <h3 className="font-serif text-2xl font-semibold text-[#f7ead2]">
              Cancel Order
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/68">
              Cancelling a completed order will restore inventory and create
              reversal ledger entries. Original sale records will remain
              unchanged.
            </p>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              className={`${inputClass} mt-5 min-h-28 py-3`}
              placeholder="Cancellation reason"
            />
            <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-[#e8dcc8]/72">
              <input
                type="checkbox"
                checked={confirmCancel}
                onChange={(event) => setConfirmCancel(event.target.checked)}
                className="mt-1"
              />
              I understand this will preserve original sale records and add
              cancellation/restoration history.
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className={buttonClass}
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isWorking || !cancelReason.trim() || !confirmCancel}
                className={buttonClass}
              >
                {isWorking ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
