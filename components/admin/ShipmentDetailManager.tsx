"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PackingSlip from "@/components/admin/PackingSlip";
import {
  addShipmentEvent,
  addTrackingInformation,
  cancelShipment,
  updateShipmentStatus,
} from "@/lib/data/shippingMutations";
import type {
  Shipment,
  ShipmentAddress,
  ShipmentEvent,
  ShipmentItem,
  ShipmentPackage,
  ShipmentStatus,
} from "@/lib/types/shipping";

type ShipmentDetailManagerProps = {
  shipment: Shipment;
  items: ShipmentItem[];
  packages: ShipmentPackage[];
  addresses: ShipmentAddress[];
  events: ShipmentEvent[];
};

const inputClass =
  "min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatAddress(address: ShipmentAddress | undefined) {
  if (!address) {
    return "Pending";
  }

  return [
    address.company,
    [address.first_name, address.last_name].filter(Boolean).join(" "),
    address.address1,
    address.address2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country,
    address.phone,
    address.email,
  ]
    .filter(Boolean)
    .join("\n");
}

function nextActions(shipment: Shipment): ShipmentStatus[] {
  if (shipment.fulfillment_type === "local_pickup") {
    if (shipment.shipment_status === "pending") return ["ready", "cancelled"];
    if (shipment.shipment_status === "ready") return ["delivered", "cancelled"];
    return [];
  }

  if (shipment.shipment_status === "pending") return ["ready", "cancelled"];
  if (shipment.shipment_status === "ready") return ["packed", "cancelled"];
  if (shipment.shipment_status === "packed") return ["shipped", "cancelled"];
  if (shipment.shipment_status === "shipped") {
    return ["in_transit", "delivered", "exception"];
  }
  if (shipment.shipment_status === "in_transit") {
    return ["delivered", "exception"];
  }
  if (shipment.shipment_status === "exception") {
    return ["in_transit", "delivered", "cancelled"];
  }

  return [];
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

export default function ShipmentDetailManager({
  shipment,
  items,
  packages,
  addresses,
  events,
}: ShipmentDetailManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [tracking, setTracking] = useState({
    carrier: shipment.carrier ?? "",
    service_level: shipment.service_level ?? "",
    tracking_number: shipment.tracking_number ?? "",
    tracking_url: shipment.tracking_url ?? "",
    shipped_at: shipment.shipped_at ?? "",
  });
  const [manualEvent, setManualEvent] = useState({
    event_type: "manual_event",
    status: shipment.shipment_status,
    location: "",
    description: "",
  });
  const shipFrom = addresses.find((address) => address.address_role === "ship_from");
  const shipTo = addresses.find((address) => address.address_role === "ship_to");

  async function runAction(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setIsWorking(true);
    const result = await action();
    setIsWorking(false);
    setMessage(result.ok ? result.message ?? "Updated." : result.error ?? "Action failed.");

    if (result.ok) {
      router.refresh();
    }
  }

  async function handleCancel() {
    const reason = window.prompt("Cancellation reason required.");

    if (!reason) {
      return;
    }

    await runAction(() => cancelShipment(shipment.id, reason));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/shipping"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Shipping
        </Link>
        <Link
          href={`/admin/orders/${shipment.order_id}`}
          className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
        >
          View Order
        </Link>
      </div>

      <section className="border border-[#d8a344]/20 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              Shipment Header
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold text-[#f7ead2]">
              {shipment.shipment_number}
            </h1>
            <p className="mt-3 text-sm capitalize text-[#e8dcc8]/62">
              {shipment.fulfillment_type.replace("_", " ")} /{" "}
              {shipment.shipment_status.replace("_", " ")}
            </p>
          </div>
          <div className="grid gap-3 text-sm text-[#e8dcc8]/72 sm:grid-cols-2">
            {[
              ["Order", shipment.order_number ?? "Pending"],
              ["Customer", shipment.customer],
              ["Carrier", shipment.carrier ?? "Pending"],
              ["Service", shipment.service_level ?? "Pending"],
              ["Tracking", shipment.tracking_number ?? "Pending"],
              ["Shipping Cost", formatCurrency(shipment.shipping_cost)],
              [
                "Shipped",
                shipment.shipped_at
                  ? new Date(shipment.shipped_at).toLocaleString()
                  : "Pending",
              ],
              [
                "Delivered",
                shipment.delivered_at
                  ? new Date(shipment.delivered_at).toLocaleString()
                  : "Pending",
              ],
            ].map(([label, value]) => (
              <div key={label} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                  {label}
                </p>
                <p className="mt-2">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}

      <DetailCard title="Actions">
        <div className="flex flex-wrap gap-3">
          {nextActions(shipment).map((status) =>
            status === "cancelled" ? (
              <button
                key={status}
                type="button"
                onClick={handleCancel}
                disabled={isWorking}
                className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
              >
                Cancel Shipment
              </button>
            ) : (
              <button
                key={status}
                type="button"
                onClick={() =>
                  runAction(() =>
                    updateShipmentStatus(
                      shipment.id,
                      status,
                      `Marked ${status.replace("_", " ")}.`,
                    ),
                  )
                }
                disabled={isWorking}
                className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
              >
                Mark {status.replace("_", " ")}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
          >
            Print Packing Slip
          </button>
        </div>
      </DetailCard>

      <DetailCard title="Shipment Items">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Order Item</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-[#f7ead2]">
                    {item.product_name}
                  </td>
                  <td className="px-4 py-3">{item.brand_name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">{item.sku ?? "Pending"}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{item.order_item_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <DetailCard title="Addresses">
          <p className="mb-4 text-sm leading-6 text-[#e8dcc8]/58">
            Shipment address shown here is the historical snapshot.
            {shipment.shipping_origin_id ? (
              <>
                {" "}
                Current origin record:{" "}
                <Link
                  href={`/admin/settings/shipping-origins/${shipment.shipping_origin_id}`}
                  className="text-[#d8a344] transition hover:text-[#f7ead2]"
                >
                  {shipment.shipping_origin_name ?? "View origin"}
                </Link>
                .
              </>
            ) : (
              " This shipment has no linked current origin record."
            )}
          </p>
          <div className="grid gap-4 text-sm text-[#e8dcc8]/72 md:grid-cols-2">
            <div className="whitespace-pre-line border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                Ship From Snapshot
              </p>
              {formatAddress(shipFrom)}
            </div>
            <div className="whitespace-pre-line border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                Ship To / Pickup Contact
              </p>
              {shipment.fulfillment_type === "local_pickup"
                ? `${shipment.customer}${
                    shipment.customer_contact
                      ? `\nContact: ${shipment.customer_contact}`
                      : ""
                  }`
                : formatAddress(shipTo)}
            </div>
          </div>
        </DetailCard>

        <DetailCard title="Packages">
          <div className="space-y-3">
            {packages.length > 0 ? (
              packages.map((packageRecord) => (
                <div
                  key={packageRecord.id}
                  className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/72"
                >
                  <p className="font-serif text-lg text-[#f7ead2]">
                    {packageRecord.package_number}
                  </p>
                  <p className="mt-2">
                    {packageRecord.package_type ?? "Package"} /{" "}
                    {packageRecord.weight_lb ?? "Pending"} lb
                  </p>
                  <p className="mt-2 text-xs text-[#e8dcc8]/48">
                    {packageRecord.length_in ?? "-"} x{" "}
                    {packageRecord.width_in ?? "-"} x{" "}
                    {packageRecord.height_in ?? "-"} in
                  </p>
                  {packageRecord.label_url ? (
                    <a
                      href={packageRecord.label_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-[#d8a344] transition hover:text-[#f7ead2]"
                    >
                      Open Shipping Label
                    </a>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-[#e8dcc8]/54">
                No packages recorded for this shipment.
              </p>
            )}
          </div>
        </DetailCard>
      </div>

      <DetailCard title="Tracking">
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={tracking.carrier}
            onChange={(event) =>
              setTracking((current) => ({ ...current, carrier: event.target.value }))
            }
            className={inputClass}
          >
            <option value="">Carrier</option>
            {["USPS", "UPS", "FedEx", "DHL", "Other", "Local Delivery", "Customer Pickup"].map(
              (carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ),
            )}
          </select>
          <input
            value={tracking.service_level}
            onChange={(event) =>
              setTracking((current) => ({
                ...current,
                service_level: event.target.value,
              }))
            }
            placeholder="Service level"
            className={inputClass}
          />
          <input
            value={tracking.tracking_number}
            onChange={(event) =>
              setTracking((current) => ({
                ...current,
                tracking_number: event.target.value,
              }))
            }
            placeholder="Tracking number"
            className={inputClass}
          />
          <input
            value={tracking.tracking_url}
            onChange={(event) =>
              setTracking((current) => ({
                ...current,
                tracking_url: event.target.value,
              }))
            }
            placeholder="Tracking URL"
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={() =>
            runAction(() =>
              addTrackingInformation(shipment.id, {
                carrier: tracking.carrier,
                service_level: tracking.service_level,
                tracking_number: tracking.tracking_number,
                tracking_url: tracking.tracking_url,
                shipped_at: tracking.shipped_at,
              }),
            )
          }
          disabled={isWorking}
          className="mt-4 inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
        >
          Add / Edit Tracking
        </button>
      </DetailCard>

      <DetailCard title="Timeline">
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/72"
            >
              <p className="font-medium text-[#f7ead2]">
                {event.event_type.replaceAll("_", " ")}
              </p>
              <p className="mt-2 capitalize">
                {event.status.replace("_", " ")} /{" "}
                {event.description ?? "No description"}
              </p>
              <p className="mt-2 text-xs text-[#d8a344]">
                {new Date(event.event_time).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <input
            value={manualEvent.event_type}
            onChange={(event) =>
              setManualEvent((current) => ({
                ...current,
                event_type: event.target.value,
              }))
            }
            placeholder="Event type"
            className={inputClass}
          />
          <input
            value={manualEvent.location}
            onChange={(event) =>
              setManualEvent((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
            placeholder="Location"
            className={inputClass}
          />
          <input
            value={manualEvent.description}
            onChange={(event) =>
              setManualEvent((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Description"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() =>
              runAction(() => addShipmentEvent(shipment.id, manualEvent))
            }
            className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
          >
            Add Event
          </button>
        </div>
      </DetailCard>

      <DetailCard title="Packing Slip">
        <PackingSlip shipment={shipment} items={items} addresses={addresses} />
      </DetailCard>
    </div>
  );
}
