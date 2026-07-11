"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  adjustInventory,
  receiveInventory,
  setReorderLevel,
  type InventoryAdjustmentType,
} from "@/lib/data/inventoryMutations";
import type {
  InventoryItem,
  InventoryTransaction,
} from "@/lib/data/inventoryRepository";

type InventoryItemDetailProps = {
  item: InventoryItem;
  transactions: InventoryTransaction[];
};

const inputClass =
  "min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70";
const textareaClass =
  "w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
        {label}
      </span>
      <div className="mt-3">{children}</div>
    </label>
  );
}

function SectionCard({
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
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function InventoryItemDetail({
  item,
  transactions,
}: InventoryItemDetailProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [quantityChange, setQuantityChange] = useState("");
  const [transactionType, setTransactionType] =
    useState<InventoryAdjustmentType>("adjustment");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [reorderValue, setReorderValue] = useState(String(item.reorder_level));
  const stats = [
    ["On Hand", item.on_hand_quantity],
    ["Reserved", item.reserved_quantity],
    ["Available", item.available_quantity],
    ["Incoming", item.incoming_quantity],
    ["Reorder Level", item.reorder_level],
    ["Inventory Value", formatCurrency(item.inventory_value)],
  ];

  async function handleAdjustment() {
    const parsedQuantity = Number(quantityChange);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity === 0) {
      setMessage("Adjustment failed: quantity change must be a non-zero whole number.");
      return;
    }

    const result = await adjustInventory({
      inventoryItemId: item.id,
      quantityChange: parsedQuantity,
      transactionType,
      notes: adjustmentNotes,
      referenceType: "Manual Adjustment",
    });

    if (!result.ok) {
      setMessage(`Adjustment failed: ${result.error}`);
      return;
    }

    setMessage("Inventory adjustment saved.");
    setQuantityChange("");
    setAdjustmentNotes("");
    router.refresh();
  }

  async function handleReceive() {
    const parsedQuantity = Number(receiveQuantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setMessage("Receiving failed: quantity received must be greater than zero.");
      return;
    }

    const result = await receiveInventory({
      inventoryItemId: item.id,
      quantityReceived: parsedQuantity,
      notes: receiveNotes,
      referenceType: "Purchase Order",
    });

    if (!result.ok) {
      setMessage(`Receiving failed: ${result.error}`);
      return;
    }

    setMessage("Inventory received.");
    setReceiveQuantity("");
    setReceiveNotes("");
    router.refresh();
  }

  async function handleReorderLevel() {
    const parsedReorderLevel = Number(reorderValue);

    if (!Number.isInteger(parsedReorderLevel) || parsedReorderLevel < 0) {
      setMessage("Reorder level must be a non-negative whole number.");
      return;
    }

    const result = await setReorderLevel(item.id, parsedReorderLevel);

    if (!result.ok) {
      setMessage(`Reorder level update failed: ${result.error}`);
      return;
    }

    setMessage("Reorder level updated.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/inventory"
        className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
      >
        Back to Inventory
      </Link>

      {message ? (
        <p className="border border-[#d8a344]/35 bg-[#d8a344]/10 px-5 py-4 text-sm font-medium text-[#f7ead2]">
          {message}
        </p>
      ) : null}

      <section className="grid gap-6 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="relative aspect-square overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(216,163,68,0.16),transparent_32%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
          {item.product.image ? (
            item.product.image.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.product.image}
                alt={item.product.name}
                className="absolute inset-0 h-full w-full object-contain p-6"
              />
            ) : (
              <Image
                src={item.product.image}
                alt={item.product.name}
                fill
                sizes="18rem"
                className="object-contain p-6"
              />
            )
          ) : null}
        </div>
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            {item.product.brand}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-[#f7ead2]">
            {item.product.name}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#e8dcc8]/65">
            {item.product.category} / {item.location_name}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["SKU", item.product.sku],
              ["Barcode", item.product.barcode],
              ["Location", item.location_name],
              ...stats,
            ].map(([label, value]) => (
              <div
                key={label}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                  {label}
                </p>
                <p className="mt-2 text-sm text-[#e8dcc8]/76">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Adjust Inventory">
          <div className="grid gap-5">
            <Field label="Quantity Change">
              <input
                type="number"
                step="1"
                value={quantityChange}
                onChange={(event) => setQuantityChange(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Reason">
              <select
                value={transactionType}
                onChange={(event) =>
                  setTransactionType(event.target.value as InventoryAdjustmentType)
                }
                className={inputClass}
              >
                {[
                  "adjustment",
                  "damage",
                  "loss",
                  "cycle_count",
                  "opening_balance",
                  "return",
                  "receiving",
                ].map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea
                value={adjustmentNotes}
                onChange={(event) => setAdjustmentNotes(event.target.value)}
                className={`${textareaClass} min-h-28`}
              />
            </Field>
            <button
              type="button"
              onClick={handleAdjustment}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062]"
            >
              Save Adjustment
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Receive Inventory">
          <div className="grid gap-5">
            <Field label="Quantity Received">
              <input
                type="number"
                min="1"
                step="1"
                value={receiveQuantity}
                onChange={(event) => setReceiveQuantity(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={receiveNotes}
                onChange={(event) => setReceiveNotes(event.target.value)}
                className={`${textareaClass} min-h-28`}
              />
            </Field>
            <button
              type="button"
              onClick={handleReceive}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062]"
            >
              Receive Stock
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Reorder Level">
          <div className="grid gap-5">
            <Field label="Editable Reorder Level">
              <input
                type="number"
                min="0"
                step="1"
                value={reorderValue}
                onChange={(event) => setReorderValue(event.target.value)}
                className={inputClass}
              />
            </Field>
            <button
              type="button"
              onClick={handleReorderLevel}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062]"
            >
              Save
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Transaction History">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Quantity Change</th>
                <th className="px-4 py-3">Balance After</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      {new Date(transaction.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {transaction.transaction_type.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">{transaction.quantity_change}</td>
                    <td className="px-4 py-3">{transaction.balance_after}</td>
                    <td className="px-4 py-3">{transaction.reference_type}</td>
                    <td className="px-4 py-3">
                      {transaction.notes ?? "No notes"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-[#e8dcc8]/54"
                  >
                    No inventory transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <p className="text-sm leading-6 text-[#e8dcc8]/52">
        Inventory adjustments currently use client-side Supabase writes.
        Production-safe atomic RPC will be added before live operational use.
      </p>
    </div>
  );
}
