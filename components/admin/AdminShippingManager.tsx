"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  cancelShipment,
  updateShipmentStatus,
} from "@/lib/data/shippingMutations";
import type {
  FulfillmentType,
  Shipment,
  ShipmentMetrics,
  ShipmentStatus,
} from "@/lib/types/shipping";
import type { ShippingOrigin } from "@/lib/types/shippingOrigin";

type AdminShippingManagerProps = {
  shipments: Shipment[];
  metrics: ShipmentMetrics;
  origins: ShippingOrigin[];
};

const inputClass =
  "min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function validNextStatus(shipment: Shipment): ShipmentStatus | null {
  if (shipment.fulfillment_type === "local_pickup") {
    if (shipment.shipment_status === "pending") return "ready";
    if (shipment.shipment_status === "ready") return "delivered";
    return null;
  }

  if (shipment.shipment_status === "pending") return "ready";
  if (shipment.shipment_status === "ready") return "packed";
  if (shipment.shipment_status === "packed") return "shipped";
  if (shipment.shipment_status === "shipped") return "in_transit";
  if (shipment.shipment_status === "in_transit") return "delivered";
  if (shipment.shipment_status === "exception") return "in_transit";

  return null;
}

function canCancel(shipment: Shipment) {
  return !["delivered", "cancelled"].includes(shipment.shipment_status);
}

export default function AdminShippingManager({
  shipments,
  metrics,
  origins,
}: AdminShippingManagerProps) {
  const { t } = useLanguage();
  const labels = t.admin.shipping;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ShipmentStatus>("all");
  const [fulfillmentType, setFulfillmentType] =
    useState<"all" | FulfillmentType>("all");
  const [shippingOrigin, setShippingOrigin] = useState("all");
  const [carrier, setCarrier] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [message, setMessage] = useState("");
  const [workingShipmentId, setWorkingShipmentId] = useState<string | null>(null);

  const filteredShipments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedCarrier = carrier.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    return shipments.filter((shipment) => {
      const createdAt = new Date(shipment.created_at);
      const searchable = [
        shipment.shipment_number,
        shipment.order_number,
        shipment.customer,
        shipment.customer_contact,
        shipment.tracking_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedSearch || searchable.includes(normalizedSearch)) &&
        (status === "all" || shipment.shipment_status === status) &&
        (fulfillmentType === "all" ||
          shipment.fulfillment_type === fulfillmentType) &&
        (shippingOrigin === "all" ||
          shipment.shipping_origin_id === shippingOrigin) &&
        (!normalizedCarrier ||
          shipment.carrier?.toLowerCase().includes(normalizedCarrier)) &&
        (!fromDate || createdAt >= fromDate) &&
        (!toDate || createdAt <= toDate)
      );
    });
  }, [
    carrier,
    dateFrom,
    dateTo,
    fulfillmentType,
    search,
    shipments,
    shippingOrigin,
    status,
  ]);

  async function moveNext(shipment: Shipment) {
    const nextStatus = validNextStatus(shipment);

    if (!nextStatus) {
      return;
    }

    setWorkingShipmentId(shipment.id);
    setMessage(labels.messages.updating);

    const result = await updateShipmentStatus(
      shipment.id,
      nextStatus,
      `Status advanced to ${nextStatus}.`,
    );

    setWorkingShipmentId(null);
    setMessage(result.ok ? labels.messages.updated : result.error);
  }

  async function handleCancel(shipment: Shipment) {
    const reason = window.prompt(labels.messages.cancellationPrompt);

    if (!reason) {
      return;
    }

    setWorkingShipmentId(shipment.id);
    setMessage(labels.messages.cancelling);

    const result = await cancelShipment(shipment.id, reason);

    setWorkingShipmentId(null);
    setMessage(result.ok ? labels.messages.cancelled : result.error);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          [labels.metrics.totalShipments, metrics.totalShipments],
          [labels.metrics.pending, metrics.pending],
          [labels.metrics.ready, metrics.ready],
          [labels.metrics.packed, metrics.packed],
          [labels.metrics.shipped, metrics.shipped],
          [labels.metrics.inTransit, metrics.inTransit],
          [labels.metrics.delivered, metrics.delivered],
          [labels.metrics.exceptions, metrics.exceptions],
          [labels.metrics.localPickup, metrics.localPickup],
          [labels.metrics.averageShipping, formatCurrency(metrics.averageShippingCost)],
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/shipping/new"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          {labels.createShipment}
        </Link>
        <p className="text-sm text-[#e8dcc8]/54">
          {labels.deferredNotice}
        </p>
      </div>

      <div className="grid gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] md:grid-cols-2 xl:grid-cols-7">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={labels.filters.searchPlaceholder}
          className={inputClass}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "all" | ShipmentStatus)}
          className={inputClass}
        >
          <option value="all">{labels.filters.status}</option>
          {[
            "pending",
            "ready",
            "packed",
            "shipped",
            "in_transit",
            "delivered",
            "cancelled",
            "exception",
          ].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={fulfillmentType}
          onChange={(event) =>
            setFulfillmentType(event.target.value as "all" | FulfillmentType)
          }
          className={inputClass}
        >
          <option value="all">{labels.filters.fulfillment}</option>
          <option value="shipping">{labels.filters.shipping}</option>
          <option value="local_pickup">{labels.filters.localPickup}</option>
        </select>
        <input
          type="search"
          value={carrier}
          onChange={(event) => setCarrier(event.target.value)}
          placeholder={labels.filters.carrier}
          className={inputClass}
        />
        <select
          value={shippingOrigin}
          onChange={(event) => setShippingOrigin(event.target.value)}
          className={inputClass}
        >
          <option value="all">{labels.filters.shipFromOrigin}</option>
          {origins.map((origin) => (
            <option key={origin.id} value={origin.id}>
              {origin.name}
            </option>
          ))}
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
        <table className="w-full min-w-[1320px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">{labels.table.shipmentNumber}</th>
              <th className="px-5 py-4">{labels.table.orderNumber}</th>
              <th className="px-5 py-4">{labels.table.customer}</th>
              <th className="px-5 py-4">{labels.table.fulfillment}</th>
              <th className="px-5 py-4">{labels.table.status}</th>
              <th className="px-5 py-4">{labels.table.packages}</th>
              <th className="px-5 py-4">{labels.table.carrier}</th>
              <th className="px-5 py-4">{labels.table.shipFrom}</th>
              <th className="px-5 py-4">{labels.table.tracking}</th>
              <th className="px-5 py-4">{labels.table.shippingCost}</th>
              <th className="px-5 py-4">{labels.table.created}</th>
              <th className="px-5 py-4">{labels.table.action}</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.length > 0 ? (
              filteredShipments.map((shipment) => {
                const nextStatus = validNextStatus(shipment);

                return (
                  <tr
                    key={shipment.id}
                    className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                  >
                    <td className="px-5 py-4 font-medium text-[#f7ead2]">
                      {shipment.shipment_number}
                    </td>
                    <td className="px-5 py-4">
                      {shipment.order_number ?? labels.table.pending}
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p>{shipment.customer}</p>
                        {shipment.customer_contact ? (
                          <p className="mt-1 text-xs text-[#e8dcc8]/50">
                            {labels.table.contact}: {shipment.customer_contact}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 capitalize">
                      {shipment.fulfillment_type.replace("_", " ")}
                    </td>
                    <td className="px-5 py-4 capitalize">
                      {shipment.shipment_status.replace("_", " ")}
                    </td>
                    <td className="px-5 py-4">{shipment.package_count}</td>
                    <td className="px-5 py-4">
                      {shipment.carrier ?? labels.table.pending}
                    </td>
                    <td className="px-5 py-4">
                      {shipment.shipping_origin_name ??
                        labels.table.historicalSnapshot}
                    </td>
                    <td className="px-5 py-4">
                      {shipment.tracking_url ? (
                        <a
                          href={shipment.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#d8a344] transition hover:text-[#f7ead2]"
                        >
                          {shipment.tracking_number ?? labels.table.track}
                        </a>
                      ) : (
                        shipment.tracking_number ?? labels.table.pending
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {formatCurrency(shipment.shipping_cost)}
                    </td>
                    <td className="px-5 py-4">
                      {new Date(shipment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/shipping/${shipment.id}`}
                          className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                        >
                          {labels.table.view}
                        </Link>
                        {nextStatus ? (
                          <button
                            type="button"
                            onClick={() => moveNext(shipment)}
                            disabled={workingShipmentId === shipment.id}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                          >
                            {labels.table.mark} {nextStatus.replace("_", " ")}
                          </button>
                        ) : null}
                        {canCancel(shipment) ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(shipment)}
                            disabled={workingShipmentId === shipment.id}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                          >
                            {labels.table.cancel}
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
                  colSpan={12}
                  className="px-5 py-14 text-center text-sm text-[#e8dcc8]/54"
                >
                  {labels.table.noMatches}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
