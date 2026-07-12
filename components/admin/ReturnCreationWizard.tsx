"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createReturn } from "@/lib/data/returnMutations";
import type { AdminOrder } from "@/lib/data/ordersRepository";
import type {
  ReturnInput,
  ReturnType,
  ReturnableOrderItem,
} from "@/lib/types/return";

type ReturnCreationWizardProps = {
  orders: AdminOrder[];
  returnableItemsByOrderId: Record<string, ReturnableOrderItem[]>;
};

type SelectedItemState = {
  quantity: string;
  reason: string;
};

const inputClass =
  "min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function ReturnCreationWizard({
  orders,
  returnableItemsByOrderId,
}: ReturnCreationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedItems, setSelectedItems] = useState<
    Record<string, SelectedItemState>
  >({});
  const [returnType, setReturnType] = useState<ReturnType>("refund");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = orderQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return orders.slice(0, 12);
    }

    return orders.filter((order) => {
      const searchable = [
        order.order_number,
        order.receipt_number,
        order.customer,
        order.customer_contact,
        order.created_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [orderQuery, orders]);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const returnableItems = selectedOrderId
    ? returnableItemsByOrderId[selectedOrderId] ?? []
    : [];
  const selectedReturnItems = returnableItems
    .map((item) => {
      const selected = selectedItems[item.order_item_id];
      const quantity = selected ? Number(selected.quantity) : 0;

      return {
        item,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        reason: selected?.reason ?? reason,
      };
    })
    .filter((selection) => selection.quantity > 0);
  const estimatedValue = selectedReturnItems.reduce(
    (total, selection) => total + selection.item.unit_price * selection.quantity,
    0,
  );

  function updateSelectedItem(
    orderItemId: string,
    updates: Partial<SelectedItemState>,
  ) {
    setSelectedItems((currentItems) => ({
      ...currentItems,
      [orderItemId]: {
        quantity: currentItems[orderItemId]?.quantity ?? "",
        reason: currentItems[orderItemId]?.reason ?? "",
        ...updates,
      },
    }));
  }

  async function handleCreateReturn() {
    if (!selectedOrder) {
      setStatus("Creation failed: original order is required.");
      return;
    }

    const payload: ReturnInput = {
      order_id: selectedOrder.id,
      return_type: returnType,
      reason,
      notes,
      items: selectedReturnItems.map((selection) => ({
        order_item_id: selection.item.order_item_id,
        quantity: selection.quantity,
        reason: selection.reason || reason,
        refund_amount: selection.item.unit_price * selection.quantity,
      })),
    };

    setIsCreating(true);
    setStatus("Creating...");
    const result = await createReturn(payload);
    setIsCreating(false);

    if (!result.ok) {
      setStatus(`Creation failed: ${result.error}`);
      return;
    }

    setStatus("Return request created.");

    if (result.returnId) {
      router.push(`/admin/returns/${result.returnId}`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        {["Find Order", "Select Items", "Details", "Review"].map(
          (label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index + 1)}
              className={`border px-4 py-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] transition ${
                step === index + 1
                  ? "border-[#d8a344] bg-[#d8a344]/12 text-[#d8a344]"
                  : "border-[#f7ead2]/10 text-[#e8dcc8]/58 hover:border-[#d8a344]/50 hover:text-[#d8a344]"
              }`}
            >
              {index + 1}. {label}
            </button>
          ),
        )}
      </div>

      {step === 1 ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl text-[#f7ead2]">Find Original Order</h2>
          <input
            value={orderQuery}
            onChange={(event) => setOrderQuery(event.target.value)}
            placeholder="Search by order number, receipt, customer, or date"
            className={`${inputClass} mt-5`}
          />
          <div className="mt-5 grid gap-3">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setStep(2);
                }}
                className={`border p-4 text-left transition ${
                  selectedOrderId === order.id
                    ? "border-[#d8a344] bg-[#d8a344]/10"
                    : "border-[#f7ead2]/10 bg-[#0f0b07] hover:border-[#d8a344]/50"
                }`}
              >
                <p className="font-serif text-xl text-[#f7ead2]">
                  {order.order_number}
                </p>
                <p className="mt-2 text-sm text-[#e8dcc8]/60">
                  {order.customer} / {formatCurrency(order.grand_total)} /{" "}
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl text-[#f7ead2]">Select Return Items</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="text-[0.66rem] uppercase tracking-[0.18em] text-[#d8a344]">
                <tr>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">Purchased</th>
                  <th className="px-3 py-3">Returned</th>
                  <th className="px-3 py-3">Returnable</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3">Quantity</th>
                  <th className="px-3 py-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {returnableItems.map((item) => (
                  <tr
                    key={item.order_item_id}
                    className="border-t border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72"
                  >
                    <td className="px-3 py-3 text-[#f7ead2]">
                      {item.product_name}
                    </td>
                    <td className="px-3 py-3">{item.sku ?? "Pending"}</td>
                    <td className="px-3 py-3">{item.quantity_purchased}</td>
                    <td className="px-3 py-3">{item.quantity_already_returned}</td>
                    <td className="px-3 py-3">{item.quantity_returnable}</td>
                    <td className="px-3 py-3">{formatCurrency(item.unit_price)}</td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity_returnable}
                        value={selectedItems[item.order_item_id]?.quantity ?? ""}
                        onChange={(event) =>
                          updateSelectedItem(item.order_item_id, {
                            quantity: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={selectedItems[item.order_item_id]?.reason ?? ""}
                        onChange={(event) =>
                          updateSelectedItem(item.order_item_id, {
                            reason: event.target.value,
                          })
                        }
                        placeholder="Item reason"
                        className={inputClass}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-5 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] md:grid-cols-2">
          <label>
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Return Type
            </span>
            <select
              value={returnType}
              onChange={(event) => setReturnType(event.target.value as ReturnType)}
              className={`${inputClass} mt-2`}
            >
              <option value="refund">Refund</option>
              <option value="exchange">Exchange</option>
              <option value="store_credit">Store Credit</option>
            </select>
          </label>
          <label>
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Expected Value
            </span>
            <p className="mt-2 flex min-h-11 items-center border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2]">
              {formatCurrency(estimatedValue)}
            </p>
          </label>
          <label className="md:col-span-2">
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Return Reason
            </span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>
          <label className="md:col-span-2">
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              className={`${inputClass} mt-2 py-3`}
            />
          </label>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-5 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl text-[#f7ead2]">Review Return</h2>
          <div className="grid gap-4 text-sm text-[#e8dcc8]/72 md:grid-cols-2">
            <p>
              <span className="text-[#d8a344]">Order:</span>{" "}
              {selectedOrder?.order_number ?? "Pending"}
            </p>
            <p>
              <span className="text-[#d8a344]">Customer:</span>{" "}
              {selectedOrder?.customer ?? "Pending"}
            </p>
            <p className="capitalize">
              <span className="text-[#d8a344]">Type:</span>{" "}
              {returnType.replace("_", " ")}
            </p>
            <p>
              <span className="text-[#d8a344]">Estimated Value:</span>{" "}
              {formatCurrency(estimatedValue)}
            </p>
          </div>
          <div className="space-y-2 text-sm text-[#e8dcc8]/72">
            {selectedReturnItems.map((selection) => (
              <p key={selection.item.order_item_id}>
                {selection.quantity} x {selection.item.product_name} /{" "}
                {formatCurrency(selection.item.unit_price * selection.quantity)}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreateReturn}
            disabled={isCreating}
            className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-6 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Return Request"}
          </button>
          {status ? <p className="text-sm text-[#d8a344]">{status}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
