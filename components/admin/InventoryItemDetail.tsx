"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { USE_SUPABASE } from "@/lib/config";
import {
  adjustInventory,
  receiveInventory,
  setReorderLevel,
  transferInventory,
  type InventoryAdjustmentType,
} from "@/lib/data/inventoryMutations";
import { launchContainment } from "@/lib/launchContainment";
import type {
  InventoryItem,
  InventoryLocation,
  InventoryTransaction,
} from "@/lib/data/inventoryRepository";

type InventoryItemDetailProps = {
  item: InventoryItem;
  locations: InventoryLocation[];
  productInventoryItems: InventoryItem[];
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

function formatTransactionType(transaction: InventoryTransaction) {
  if (transaction.reference_type === "Inventory Transfer") {
    if (transaction.transaction_type === "transfer_out") {
      return "Transfer Out";
    }

    if (transaction.transaction_type === "transfer_in") {
      return "Transfer In";
    }
  }

  return transaction.transaction_type.replaceAll("_", " ");
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
  locations,
  productInventoryItems,
  transactions,
}: InventoryItemDetailProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const containmentLabels = t.admin.launchContainment;
  const [message, setMessage] = useState("");
  const [quantityChange, setQuantityChange] = useState("");
  const [transactionType, setTransactionType] =
    useState<InventoryAdjustmentType>("adjustment");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [reorderValue, setReorderValue] = useState(String(item.reorder_level));
  const transferLocationOptions = locations.filter(
    (location) => location.id !== item.location_id,
  );
  const [toLocationId, setToLocationId] = useState(
    transferLocationOptions[0]?.id ?? "",
  );
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const parsedTransferQuantity = Number(transferQuantity);
  const isTransferQuantityValid =
    Number.isInteger(parsedTransferQuantity) && parsedTransferQuantity > 0;
  const isTransferOverAvailable =
    isTransferQuantityValid && parsedTransferQuantity > item.available_quantity;
  const canTransfer =
    !launchContainment.inventoryTransfers &&
    USE_SUPABASE &&
    Boolean(toLocationId) &&
    isTransferQuantityValid &&
    !isTransferOverAvailable;
  const stats = [
    ["On Hand", item.on_hand_quantity],
    ["Reserved", item.reserved_quantity],
    ["Available", item.available_quantity],
    ["Incoming", item.incoming_quantity],
    ["Reorder Level", item.reorder_level],
    ["Inventory Value", formatCurrency(item.inventory_value)],
  ];

  async function handleAdjustment() {
    if (launchContainment.inventoryWrites) {
      setMessage(containmentLabels.inventoryActionsUnavailable);
      return;
    }

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
    if (launchContainment.inventoryWrites) {
      setMessage(containmentLabels.inventoryActionsUnavailable);
      return;
    }

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
    if (launchContainment.inventoryWrites) {
      setMessage(containmentLabels.inventoryActionsUnavailable);
      return;
    }

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

  async function handleTransfer() {
    if (launchContainment.inventoryTransfers) {
      setMessage(containmentLabels.inventoryActionsUnavailable);
      return;
    }

    if (!USE_SUPABASE) {
      setMessage("Transfer failed: Inventory transfers require Supabase mode.");
      return;
    }

    if (!toLocationId) {
      setMessage("Transfer failed: select a destination location.");
      return;
    }

    if (item.location_id === toLocationId) {
      setMessage("Source and destination must be different.");
      return;
    }

    if (!isTransferQuantityValid) {
      setMessage("Transfer failed: quantity must be greater than zero.");
      return;
    }

    if (parsedTransferQuantity > item.available_quantity) {
      setMessage("Not enough stock available.");
      return;
    }

    setMessage("Transferring...");

    const result = await transferInventory({
      productId: item.product_id,
      fromLocationId: item.location_id,
      toLocationId,
      quantity: parsedTransferQuantity,
      notes: transferNotes,
    });

    if (!result.ok) {
      setMessage(`Transfer failed: ${result.error}`);
      return;
    }

    setMessage("Transfer completed.");
    setTransferQuantity("");
    setTransferNotes("");
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

      <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-5 py-4 text-sm leading-6 text-[#e8dcc8]/72">
        {launchContainment.inventoryTransfers
          ? containmentLabels.inventoryReadOnly
          : "Adjustment, receiving, and reorder actions remain read-only. Transfer Stock is active for controlled store replenishment."}
      </p>

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

      <div className="grid gap-6 xl:grid-cols-4">
        <SectionCard title="Adjust Inventory">
          <div className="grid gap-5">
            <Field label="Quantity Change">
              <input
                type="number"
                step="1"
                value={quantityChange}
                onChange={(event) => setQuantityChange(event.target.value)}
                className={inputClass}
                disabled={launchContainment.inventoryWrites}
              />
            </Field>
            <Field label="Reason">
              <select
                value={transactionType}
                onChange={(event) =>
                  setTransactionType(event.target.value as InventoryAdjustmentType)
                }
                className={inputClass}
                disabled={launchContainment.inventoryWrites}
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
                disabled={launchContainment.inventoryWrites}
              />
            </Field>
            <button
              type="button"
              onClick={handleAdjustment}
              disabled={launchContainment.inventoryWrites}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062] disabled:cursor-not-allowed disabled:bg-[#d8a344]/30 disabled:text-[#0f0b07]/50"
            >
              {launchContainment.inventoryWrites
                ? containmentLabels.actionUnavailable
                : "Save Adjustment"}
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
                disabled={launchContainment.inventoryWrites}
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={receiveNotes}
                onChange={(event) => setReceiveNotes(event.target.value)}
                className={`${textareaClass} min-h-28`}
                disabled={launchContainment.inventoryWrites}
              />
            </Field>
            <button
              type="button"
              onClick={handleReceive}
              disabled={launchContainment.inventoryWrites}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062] disabled:cursor-not-allowed disabled:bg-[#d8a344]/30 disabled:text-[#0f0b07]/50"
            >
              {launchContainment.inventoryWrites
                ? containmentLabels.actionUnavailable
                : "Receive Stock"}
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
                disabled={launchContainment.inventoryWrites}
              />
            </Field>
            <button
              type="button"
              onClick={handleReorderLevel}
              disabled={launchContainment.inventoryWrites}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062] disabled:cursor-not-allowed disabled:bg-[#d8a344]/30 disabled:text-[#0f0b07]/50"
            >
              {launchContainment.inventoryWrites
                ? containmentLabels.actionUnavailable
                : "Save"}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Transfer Inventory">
          <div className="grid gap-5">
            {!USE_SUPABASE ? (
              <p className="border border-[#d8a344]/20 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#e8dcc8]/70">
                Inventory transfers require Supabase mode.
              </p>
            ) : null}
            <Field label="From Location">
              <input
                type="text"
                value={item.location_name}
                readOnly
                className={`${inputClass} cursor-not-allowed text-[#e8dcc8]/58`}
              />
              <p className="mt-2 text-xs text-[#e8dcc8]/52">
                Available: {item.available_quantity}
              </p>
            </Field>
            <Field label="To Location">
              <select
                value={toLocationId}
                onChange={(event) => setToLocationId(event.target.value)}
                className={inputClass}
                disabled={!USE_SUPABASE || launchContainment.inventoryTransfers}
              >
                {transferLocationOptions.length > 0 ? (
                  transferLocationOptions.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))
                ) : (
                  <option value="">No destination locations</option>
                )}
              </select>
            </Field>
            <Field label="Quantity">
              <input
                type="number"
                min="1"
                step="1"
                value={transferQuantity}
                onChange={(event) => setTransferQuantity(event.target.value)}
                className={inputClass}
                disabled={!USE_SUPABASE || launchContainment.inventoryTransfers}
              />
              {isTransferOverAvailable ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#d8a344]">
                  Not enough stock available
                </p>
              ) : null}
            </Field>
            <Field label="Notes">
              <textarea
                value={transferNotes}
                onChange={(event) => setTransferNotes(event.target.value)}
                className={`${textareaClass} min-h-28`}
                disabled={!USE_SUPABASE || launchContainment.inventoryTransfers}
              />
            </Field>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={!canTransfer}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062] disabled:cursor-not-allowed disabled:bg-[#d8a344]/30 disabled:text-[#0f0b07]/50"
            >
              {launchContainment.inventoryTransfers
                ? containmentLabels.actionUnavailable
                : "Transfer Stock"}
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="All Product Locations">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">On Hand</th>
                <th className="px-4 py-3">Reserved</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Incoming</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {productInventoryItems.map((inventoryItem) => (
                <tr
                  key={inventoryItem.id}
                  className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-[#f7ead2]">
                    {inventoryItem.location_name}
                  </td>
                  <td className="px-4 py-3">{inventoryItem.on_hand_quantity}</td>
                  <td className="px-4 py-3">
                    {inventoryItem.reserved_quantity}
                  </td>
                  <td className="px-4 py-3">
                    {inventoryItem.available_quantity}
                  </td>
                  <td className="px-4 py-3">
                    {inventoryItem.incoming_quantity}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(inventoryItem.inventory_value)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/inventory/${inventoryItem.id}`}
                      className="inline-flex min-h-9 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

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
                    <td className="px-4 py-3">{formatTransactionType(transaction)}</td>
                    <td className="px-4 py-3">{transaction.quantity_change}</td>
                    <td className="px-4 py-3">{transaction.balance_after}</td>
                    <td className="px-4 py-3">
                      <p>{transaction.reference_type}</p>
                      {transaction.reference_id ? (
                        <p className="mt-1 break-all text-xs text-[#e8dcc8]/45">
                          {transaction.reference_id}
                        </p>
                      ) : null}
                    </td>
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
        {launchContainment.inventoryTransfers
          ? containmentLabels.inventoryReadOnly
          : "Transfers are enabled for controlled store replenishment. Other inventory write tools remain contained."}
      </p>
    </div>
  );
}
