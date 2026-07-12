"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
    setMessage("Updating shipment...");

    const result = await updateShipmentStatus(
      shipment.id,
      nextStatus,
      `Status advanced to ${nextStatus}.`,
    );

    setWorkingShipmentId(null);
    setMessage(result.ok ? "Shipment updated." : result.error);
  }

  async function handleCancel(shipment: Shipment) {
    const reason = window.prompt("Cancellation reason required.");

    if (!reason) {
      return;
    }

    setWorkingShipmentId(shipment.id);
    setMessage("Cancelling shipment...");

    const result = await cancelShipment(shipment.id, reason);

    setWorkingShipmentId(null);
    setMessage(result.ok ? "Shipment cancelled." : result.error);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total Shipments", metrics.totalShipments],
          ["Pending", metrics.pending],
          ["Ready", metrics.ready],
          ["Packed", metrics.packed],
          ["Shipped", metrics.shipped],
          ["In Transit", metrics.inTransit],
          ["Delivered", metrics.delivered],
          ["Exceptions", metrics.exceptions],
          ["Local Pickup", metrics.localPickup],
          ["Avg. Shipping", formatCurrency(metrics.averageShippingCost)],
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
          Create Shipment
        </Link>
        <p className="text-sm text-[#e8dcc8]/54">
          Live carrier rates and label purchases remain deferred.
        </p>
      </div>

      <div className="grid gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] md:grid-cols-2 xl:grid-cols-7">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Shipment, order, tracking"
          className={inputClass}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "all" | ShipmentStatus)}
          className={inputClass}
        >
          <option value="all">Status</option>
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
          <option value="all">Fulfillment</option>
          <option value="shipping">Shipping</option>
          <option value="local_pickup">Local Pickup</option>
        </select>
        <input
          type="search"
          value={carrier}
          onChange={(event) => setCarrier(event.target.value)}
          placeholder="Carrier"
          className={inputClass}
        />
        <select
          value={shippingOrigin}
          onChange={(event) => setShippingOrigin(event.target.value)}
          className={inputClass}
        >
          <option value="all">Ship From Origin</option>
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
              <th className="px-5 py-4">Shipment Number</th>
              <th className="px-5 py-4">Order Number</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Fulfillment</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Packages</th>
              <th className="px-5 py-4">Carrier</th>
              <th className="px-5 py-4">Ship From</th>
              <th className="px-5 py-4">Tracking</th>
              <th className="px-5 py-4">Shipping Cost</th>
              <th className="px-5 py-4">Created</th>
              <th className="px-5 py-4">Action</th>
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
                      {shipment.order_number ?? "Pending"}
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p>{shipment.customer}</p>
                        {shipment.customer_contact ? (
                          <p className="mt-1 text-xs text-[#e8dcc8]/50">
                            Contact: {shipment.customer_contact}
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
                    <td className="px-5 py-4">{shipment.carrier ?? "Pending"}</td>
                    <td className="px-5 py-4">
                      {shipment.shipping_origin_name ?? "Historical Snapshot"}
                    </td>
                    <td className="px-5 py-4">
                      {shipment.tracking_url ? (
                        <a
                          href={shipment.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#d8a344] transition hover:text-[#f7ead2]"
                        >
                          {shipment.tracking_number ?? "Track"}
                        </a>
                      ) : (
                        shipment.tracking_number ?? "Pending"
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
                          View
                        </Link>
                        {nextStatus ? (
                          <button
                            type="button"
                            onClick={() => moveNext(shipment)}
                            disabled={workingShipmentId === shipment.id}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                          >
                            Mark {nextStatus.replace("_", " ")}
                          </button>
                        ) : null}
                        {canCancel(shipment) ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(shipment)}
                            disabled={workingShipmentId === shipment.id}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
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
                  colSpan={12}
                  className="px-5 py-14 text-center text-sm text-[#e8dcc8]/54"
                >
                  No shipments match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
