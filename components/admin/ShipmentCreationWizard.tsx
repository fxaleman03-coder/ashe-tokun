"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createShipment, deriveTrackingUrl } from "@/lib/data/shippingMutations";
import type { AdminOrder } from "@/lib/data/ordersRepository";
import type { CustomerAddress } from "@/lib/types/customer";
import type {
  FulfillableOrderItem,
  FulfillmentType,
  PackageInput,
  ShipmentAddressInput,
} from "@/lib/types/shipping";
import type { ShippingOrigin } from "@/lib/types/shippingOrigin";

type ShipmentCreationWizardProps = {
  orders: AdminOrder[];
  fulfillableItemsByOrderId: Record<string, FulfillableOrderItem[]>;
  addressesByCustomerId: Record<string, CustomerAddress[]>;
  shippingOrigins: ShippingOrigin[];
};

const inputClass =
  "min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";
const navButtonClass =
  "inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:cursor-not-allowed disabled:border-[#f7ead2]/10 disabled:text-[#e8dcc8]/30 disabled:hover:bg-transparent";

const carrierOptions = ["USPS", "UPS", "FedEx", "DHL", "Other", "Local Delivery"];
const serviceLevelOptions = [
  "Ground",
  "Priority Mail",
  "Priority Mail Express",
  "2nd Day Air",
  "Next Day Air",
  "Standard",
  "Other",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function toAddressInput(address: CustomerAddress): ShipmentAddressInput {
  return {
    first_name: address.first_name,
    last_name: address.last_name,
    company: address.company,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code ?? "",
    country: address.country ?? "US",
  };
}

const emptyAddress: ShipmentAddressInput = {
  first_name: "",
  last_name: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
  phone: "",
  email: "",
};

const emptyPackage: PackageInput = {
  package_number: "PKG-01",
  length_in: null,
  width_in: null,
  height_in: null,
  weight_lb: null,
  package_type: "",
  label_url: "",
};

export default function ShipmentCreationWizard({
  orders,
  fulfillableItemsByOrderId,
  addressesByCustomerId,
  shippingOrigins,
}: ShipmentCreationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>("shipping");
  const [selectedQuantities, setSelectedQuantities] = useState<
    Record<string, string>
  >({});
  const selectableOrigins = shippingOrigins.filter(
    (origin) => origin.active && origin.is_complete,
  );
  const defaultOrigin =
    selectableOrigins.find((origin) => origin.is_default) ?? selectableOrigins[0];
  const [selectedOriginId, setSelectedOriginId] = useState(defaultOrigin?.id ?? "");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [manualAddress, setManualAddress] =
    useState<ShipmentAddressInput>(emptyAddress);
  const [packages, setPackages] = useState<PackageInput[]>([emptyPackage]);
  const [carrier, setCarrier] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [shippingCost, setShippingCost] = useState("0.00");
  const [pickupContact, setPickupContact] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const selectedItems = selectedOrderId
    ? fulfillableItemsByOrderId[selectedOrderId] ?? []
    : [];
  const selectedAddresses =
    selectedOrder?.customer_id && addressesByCustomerId[selectedOrder.customer_id]
      ? addressesByCustomerId[selectedOrder.customer_id]
      : [];
  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const hasRemainingItems = (fulfillableItemsByOrderId[order.id] ?? []).some(
        (item) => item.remaining_fulfillable_quantity > 0,
      );
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

      return hasRemainingItems && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [fulfillableItemsByOrderId, orders, query]);

  const selectedShipmentItems = Object.entries(selectedQuantities)
    .map(([order_item_id, quantity]) => ({
      order_item_id,
      quantity: quantity === "" ? 0 : Number(quantity),
    }))
    .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0);
  const quantityOverage = selectedShipmentItems.some((selectedItem) => {
    const sourceItem = selectedItems.find(
      (item) => item.id === selectedItem.order_item_id,
    );

    return (
      !sourceItem ||
      selectedItem.quantity > sourceItem.remaining_fulfillable_quantity
    );
  });
  const selectedAddress = selectedAddressId
    ? selectedAddresses.find((address) => address.id === selectedAddressId)
    : null;
  const shippingAddress = selectedAddress
    ? toAddressInput(selectedAddress)
    : manualAddress;
  const selectedOrigin = shippingOrigins.find(
    (origin) => origin.id === selectedOriginId,
  );
  const originError =
    fulfillmentType === "shipping" && !selectedOrigin
      ? "Select a Ship From origin."
      : fulfillmentType === "shipping" && selectedOrigin && !selectedOrigin.active
        ? "Selected origin is inactive."
        : fulfillmentType === "shipping" && selectedOrigin && !selectedOrigin.is_complete
          ? "Selected origin is incomplete."
          : null;
  const orderError = !selectedOrder ? "Select an eligible order." : null;
  const fulfillmentError = !fulfillmentType
    ? "Select shipping or local pickup."
    : null;
  const quantityError =
    selectedShipmentItems.length === 0
      ? "Select at least one item quantity."
      : quantityOverage
        ? "Selected quantity cannot exceed remaining fulfillable quantity."
        : null;
  const shipToError =
    fulfillmentType === "shipping" &&
    (!shippingAddress.address1.trim() ||
      !shippingAddress.city.trim() ||
      !shippingAddress.postal_code.trim() ||
      !shippingAddress.country.trim())
      ? "Ship To requires address, city, postal code, and country."
      : null;
  const pickupError =
    fulfillmentType === "local_pickup" &&
    (!pickupContact.trim() || !pickupInstructions.trim())
      ? "Local pickup requires a pickup contact and instructions."
      : null;
  const invalidPackage = packages.find((packageInput) => {
    const hasPackageNumber = Boolean(packageInput.package_number?.trim());
    const hasWeight = Number(packageInput.weight_lb) > 0;
    const hasLength = Number(packageInput.length_in) > 0;
    const hasWidth = Number(packageInput.width_in) > 0;
    const hasHeight = Number(packageInput.height_in) > 0;

    return !(
      hasPackageNumber &&
      hasWeight &&
      hasLength &&
      hasWidth &&
      hasHeight
    );
  });
  const packageError =
    fulfillmentType === "shipping" && packages.length < 1
      ? "At least one package is required."
      : fulfillmentType === "shipping" && invalidPackage
        ? "Each package requires a package number, dimensions, and weight."
        : fulfillmentType === "shipping" && !carrier.trim()
          ? "Select a carrier."
          : null;
  const shippingCostNumber = Number(shippingCost || 0);
  const shippingCostError =
    fulfillmentType === "shipping" &&
    (Number.isNaN(shippingCostNumber) || shippingCostNumber < 0)
      ? "Shipping cost must be zero or greater."
      : null;
  const derivedTrackingUrl =
    carrier && trackingNumber ? deriveTrackingUrl(carrier, trackingNumber) : "";
  const finalTrackingUrl = trackingUrl.trim() || derivedTrackingUrl;
  const stepErrors: Record<number, string[]> = {
    1: [orderError].filter(Boolean) as string[],
    2: [fulfillmentError].filter(Boolean) as string[],
    3: [quantityError].filter(Boolean) as string[],
    4: [originError, shipToError, pickupError].filter(Boolean) as string[],
    5: [packageError, shippingCostError].filter(Boolean) as string[],
    6: [
      orderError,
      fulfillmentError,
      quantityError,
      originError,
      shipToError,
      pickupError,
      packageError,
      shippingCostError,
    ].filter(Boolean) as string[],
  };
  const canCreate = stepErrors[6].length === 0;

  function goToStep(nextStep: number) {
    if (nextStep <= step) {
      setStep(nextStep);
      return;
    }

    if (stepErrors[step].length === 0) {
      setStep(nextStep);
    }
  }

  function renderStepErrors(stepNumber: number) {
    const errors = stepErrors[stepNumber];

    if (!errors.length) {
      return null;
    }

    return (
      <div className="mt-4 space-y-2">
        {errors.map((error) => (
          <p key={error} className="text-sm text-[#d8a344]">
            {error}
          </p>
        ))}
      </div>
    );
  }

  function renderNavigation(
    nextLabel?: string,
    nextStep?: number,
    options: { showBack?: boolean; create?: boolean } = {},
  ) {
    const isStepValid = stepErrors[step].length === 0;

    return (
      <div className="mt-6 flex flex-wrap gap-3">
        {options.showBack ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className={navButtonClass}
          >
            Back
          </button>
        ) : null}
        {options.create ? (
          <button
            type="button"
            onClick={handleCreateShipment}
            disabled={isCreating || !canCreate}
            className={`${navButtonClass} bg-[#d8a344] text-[#0f0b07] hover:shadow-[0_0_36px_rgba(216,163,68,0.26)]`}
          >
            {isCreating ? "Creating..." : "Create Shipment"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => nextStep && goToStep(nextStep)}
            disabled={!isStepValid}
            className={navButtonClass}
          >
            {nextLabel}
          </button>
        )}
      </div>
    );
  }

  function updateQuantity(itemId: string, value: string) {
    const item = selectedItems.find((candidate) => candidate.id === itemId);

    if (value === "") {
      setSelectedQuantities((current) => ({ ...current, [itemId]: "" }));
      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    const normalizedValue = String(Number(value));
    const safeQuantity = Math.min(
      Math.max(Number(normalizedValue), 0),
      item?.remaining_fulfillable_quantity ?? 0,
    );

    setSelectedQuantities((current) => ({
      ...current,
      [itemId]: safeQuantity === 0 ? "" : String(safeQuantity),
    }));
  }

  function normalizeQuantityOnBlur(itemId: string) {
    const item = selectedItems.find((candidate) => candidate.id === itemId);
    const currentValue = selectedQuantities[itemId] ?? "";

    if (currentValue === "") {
      setSelectedQuantities((current) => ({ ...current, [itemId]: "0" }));
      return;
    }

    const quantity = Math.min(
      Math.max(Number(currentValue), 0),
      item?.remaining_fulfillable_quantity ?? 0,
    );

    setSelectedQuantities((current) => ({
      ...current,
      [itemId]: String(quantity),
    }));
  }

  async function handleCreateShipment() {
    if (!selectedOrder) {
      setMessage("Select an order first.");
      return;
    }

    setIsCreating(true);
    setMessage("Creating shipment...");

    const pickupNote =
      fulfillmentType === "local_pickup"
        ? `Pickup Contact: ${pickupContact.trim()}. Instructions: ${pickupInstructions.trim()}`
        : null;
    const combinedNotes = [pickupNote, notes.trim()].filter(Boolean).join("\n");
    const result = await createShipment({
      order_id: selectedOrder.id,
      fulfillment_type: fulfillmentType,
      shippingOriginId: selectedOriginId || null,
      items: selectedShipmentItems,
      ship_to: fulfillmentType === "shipping" ? shippingAddress : null,
      packages: fulfillmentType === "shipping" ? packages : [],
      carrier: fulfillmentType === "shipping" ? carrier.trim() || null : null,
      service_level:
        fulfillmentType === "shipping" ? serviceLevel.trim() || null : null,
      tracking_number:
        fulfillmentType === "shipping" ? trackingNumber.trim() || null : null,
      tracking_url:
        fulfillmentType === "shipping" ? finalTrackingUrl || null : null,
      shipping_cost:
        fulfillmentType === "shipping" ? shippingCostNumber : 0,
      notes: combinedNotes || null,
    });

    setIsCreating(false);

    if (!result.ok) {
      setMessage(`Creation failed: ${result.error}`);
      return;
    }

    setMessage(
      `Shipment ${result.shipmentNumber ?? ""} created. ${
        carrier ? `${carrier}${serviceLevel ? ` / ${serviceLevel}` : ""}.` : ""
      }`,
    );

    if (result.shipmentId) {
      router.push(`/admin/shipping/${result.shipmentId}`);
    }
  }

  function updatePackageField<Key extends keyof PackageInput>(
    index: number,
    key: Key,
    value: PackageInput[Key],
  ) {
    setPackages((currentPackages) =>
      currentPackages.map((packageInput, packageIndex) =>
        packageIndex === index
          ? { ...packageInput, [key]: value }
          : packageInput,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-6">
        {["Order", "Fulfillment", "Items", "Address", "Packages", "Review"].map(
          (label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => goToStep(index + 1)}
              disabled={index + 1 > step}
              className={`min-h-11 border px-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] transition ${
                step === index + 1
                  ? "border-[#d8a344] bg-[#1a1209] text-[#d8a344]"
                  : index + 1 > step
                    ? "cursor-not-allowed border-[#f7ead2]/10 text-[#e8dcc8]/28"
                    : "border-[#f7ead2]/10 text-[#e8dcc8]/62 hover:border-[#d8a344]/60 hover:text-[#d8a344]"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {step === 1 ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
            Find Order
          </h2>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
                  setPickupContact(order.customer ?? "");
                  setSelectedQuantities(
                    Object.fromEntries(
                      (fulfillableItemsByOrderId[order.id] ?? []).map((item) => [
                        item.id,
                        item.remaining_fulfillable_quantity === 1 ? "1" : "0",
                      ]),
                    ),
                  );
                }}
                className={`border p-4 text-left transition ${
                  selectedOrderId === order.id
                    ? "border-[#d8a344]/70 bg-[#1a1209]"
                    : "border-[#f7ead2]/10 bg-[#0f0b07] hover:border-[#d8a344]/50"
                }`}
              >
                <p className="font-serif text-xl text-[#f7ead2]">
                  {order.order_number}
                </p>
                <p className="mt-2 text-sm text-[#e8dcc8]/62">
                  {order.customer} / {order.sales_channel} /{" "}
                  {formatCurrency(order.grand_total)}
                </p>
              </button>
            ))}
          </div>
          {renderStepErrors(1)}
          {renderNavigation("Continue to Fulfillment", 2)}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
            Fulfillment Type
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["shipping", "Shipping"],
              ["local_pickup", "Local Pickup"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFulfillmentType(value as FulfillmentType)}
                className={`border p-5 text-left transition ${
                  fulfillmentType === value
                    ? "border-[#d8a344]/70 bg-[#1a1209] text-[#d8a344]"
                    : "border-[#f7ead2]/10 bg-[#0f0b07] text-[#e8dcc8]/72 hover:border-[#d8a344]/50"
                }`}
              >
                <p className="font-serif text-xl">{label}</p>
              </button>
            ))}
          </div>
          {renderStepErrors(2)}
          {renderNavigation("Continue to Items", 3)}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
            Select Items
          </h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Ordered</th>
                  <th className="px-4 py-3">Fulfilled</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Selected</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[#f7ead2]">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3">{item.sku ?? "Pending"}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">
                      {item.already_fulfilled_quantity}
                    </td>
                    <td className="px-4 py-3">
                      {item.remaining_fulfillable_quantity}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        max={item.remaining_fulfillable_quantity}
                        value={selectedQuantities[item.id] ?? 0}
                        onChange={(event) =>
                          updateQuantity(item.id, event.target.value)
                        }
                        onBlur={() => normalizeQuantityOnBlur(item.id)}
                        className={`${inputClass} max-w-28`}
                      />
                      {selectedQuantities[item.id] &&
                      !/^\d+$/.test(selectedQuantities[item.id] ?? "") ? (
                        <p className="mt-2 text-xs text-[#d8a344]">
                          Whole numbers only.
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderStepErrors(3)}
          {renderNavigation("Continue to Address", 4, { showBack: true })}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
            Address
          </h2>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                Ship From
              </p>
              <select
                value={selectedOriginId}
                onChange={(event) => setSelectedOriginId(event.target.value)}
                className={`${inputClass} mt-4`}
              >
                <option value="">Select origin</option>
                {selectableOrigins.map((origin) => (
                  <option key={origin.id} value={origin.id}>
                    {origin.name}
                    {origin.is_default ? " (Default)" : ""}
                  </option>
                ))}
              </select>
              {selectedOrigin ? (
                <div className="mt-4 space-y-2 text-sm text-[#e8dcc8]/62">
                  <p className="font-serif text-xl text-[#f7ead2]">
                    {selectedOrigin.company_name}
                  </p>
                  <p>Contact: {selectedOrigin.contact_name ?? "Pending"}</p>
                  <p>{selectedOrigin.address1 || "Address pending"}</p>
                  <p>
                    {[selectedOrigin.city, selectedOrigin.state, selectedOrigin.postal_code]
                      .filter(Boolean)
                      .join(", ") || "City / State / ZIP pending"}
                  </p>
                  <p>Country: {selectedOrigin.country || "Pending"}</p>
                  <p>Phone: {selectedOrigin.phone ?? "Pending"}</p>
                  <p>Email: {selectedOrigin.email ?? "Pending"}</p>
                  {selectedOrigin.is_default ? (
                    <span className="inline-flex border border-[#d8a344]/35 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                      Default
                    </span>
                  ) : null}
                  {originError ? (
                    <p className="text-[#d8a344]">{originError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                Ship To
              </p>
              {fulfillmentType === "shipping" ? (
                <div className="mt-4 space-y-5">
                  <select
                    value={selectedAddressId}
                    onChange={(event) => setSelectedAddressId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Manual snapshot</option>
                    {selectedAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.address1}, {address.city}
                      </option>
                    ))}
                  </select>
                  {!selectedAddressId ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {(
                        [
                          ["first_name", "First Name"],
                          ["last_name", "Last Name"],
                          ["company", "Company"],
                          ["address1", "Address 1"],
                          ["address2", "Address 2"],
                          ["city", "City"],
                          ["state", "State"],
                          ["postal_code", "Postal Code"],
                          ["country", "Country"],
                          ["phone", "Phone"],
                          ["email", "Email"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key}>
                          <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                            {label}
                          </span>
                          <input
                            value={manualAddress[key] ?? ""}
                            onChange={(event) =>
                              setManualAddress((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className={`${inputClass} mt-2`}
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {shipToError ? (
                    <p className="text-sm text-[#d8a344]">{shipToError}</p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <label>
                    <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                      Pickup Contact
                    </span>
                    <input
                      value={pickupContact}
                      onChange={(event) => setPickupContact(event.target.value)}
                      placeholder="Pickup contact"
                      className={`${inputClass} mt-2`}
                    />
                  </label>
                  <label>
                    <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                      Pickup Instructions
                    </span>
                    <textarea
                      value={pickupInstructions}
                      onChange={(event) =>
                        setPickupInstructions(event.target.value)
                      }
                      rows={4}
                      placeholder="Pickup timing, handoff notes, or customer instructions"
                      className={`${inputClass} mt-2 py-3`}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          {renderStepErrors(4)}
          {renderNavigation("Continue to Packages", 5, { showBack: true })}
        </section>
      ) : null}

      {step === 5 ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
            Packages
          </h2>
          {fulfillmentType === "shipping" ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] p-4 md:grid-cols-2">
                <label>
                  <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                    Carrier
                  </span>
                  <select
                    value={carrier}
                    onChange={(event) => {
                      setCarrier(event.target.value);
                      if (event.target.value === "Other") {
                        setTrackingUrl("");
                      }
                    }}
                    className={`${inputClass} mt-2`}
                  >
                    <option value="">Select carrier</option>
                    {carrierOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                    Service Level
                  </span>
                  <input
                    value={serviceLevel}
                    onChange={(event) => setServiceLevel(event.target.value)}
                    list="shipment-service-levels"
                    placeholder="Ground, Priority Mail, Standard"
                    className={`${inputClass} mt-2`}
                  />
                  <datalist id="shipment-service-levels">
                    {serviceLevelOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                    Tracking Number
                  </span>
                  <input
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    placeholder="Optional at creation"
                    className={`${inputClass} mt-2`}
                  />
                </label>
                <label>
                  <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                    Tracking URL
                  </span>
                  <input
                    value={trackingUrl || derivedTrackingUrl}
                    onChange={(event) => setTrackingUrl(event.target.value)}
                    placeholder="Auto-generated when possible"
                    className={`${inputClass} mt-2`}
                  />
                  {derivedTrackingUrl && !trackingUrl ? (
                    <p className="mt-2 text-xs text-[#e8dcc8]/48">
                      Generated from carrier and tracking number.
                    </p>
                  ) : null}
                </label>
                <label>
                  <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                    Shipping Cost
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCost}
                    onChange={(event) => setShippingCost(event.target.value)}
                    className={`${inputClass} mt-2`}
                  />
                </label>
              </div>
              {packages.map((packageInput, index) => (
                <div
                  key={index}
                  className="grid gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] p-4 md:grid-cols-3"
                >
                  <input
                    value={packageInput.package_number ?? ""}
                    onChange={(event) =>
                      updatePackageField(index, "package_number", event.target.value)
                    }
                    placeholder="Package number"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={packageInput.weight_lb ?? ""}
                    onChange={(event) =>
                      updatePackageField(
                        index,
                        "weight_lb",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    placeholder="Weight lb"
                    className={inputClass}
                  />
                  <input
                    value={packageInput.package_type ?? ""}
                    onChange={(event) =>
                      updatePackageField(index, "package_type", event.target.value)
                    }
                    placeholder="Package type"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={packageInput.length_in ?? ""}
                    onChange={(event) =>
                      updatePackageField(
                        index,
                        "length_in",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    placeholder="Length"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={packageInput.width_in ?? ""}
                    onChange={(event) =>
                      updatePackageField(
                        index,
                        "width_in",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    placeholder="Width"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={packageInput.height_in ?? ""}
                    onChange={(event) =>
                      updatePackageField(
                        index,
                        "height_in",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    placeholder="Height"
                    className={inputClass}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setPackages((current) => [
                    ...current,
                    {
                      ...emptyPackage,
                      package_number: `PKG-${String(current.length + 1).padStart(2, "0")}`,
                    },
                  ])
                }
                className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
              >
                Add Package
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#e8dcc8]/58">
              Packages are not required for local pickup.
            </p>
          )}
          {renderStepErrors(5)}
          {renderNavigation("Continue to Review", 6, { showBack: true })}
        </section>
      ) : null}

      {step === 6 ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
            Review
          </h2>
          <div className="mt-5 grid gap-4 text-sm text-[#e8dcc8]/72 md:grid-cols-2">
            <p>Order: {selectedOrder?.order_number ?? "Pending"}</p>
            <p>Fulfillment: {fulfillmentType.replace("_", " ")}</p>
            <p>Selected Items: {selectedShipmentItems.length}</p>
            {fulfillmentType === "shipping" ? (
              <>
                <p>Ship From: {selectedOrigin?.name ?? "Pending"}</p>
                <p>Carrier: {carrier || "Pending"}</p>
                <p>Service Level: {serviceLevel || "Pending"}</p>
                <p>Tracking: {trackingNumber || "Pending"}</p>
                <p>Shipping Cost: {formatCurrency(shippingCostNumber || 0)}</p>
                <p>Packages: {packages.length}</p>
              </>
            ) : (
              <>
                <p>Pickup Contact: {pickupContact || "Pending"}</p>
                <p>Pickup Instructions: {pickupInstructions || "Pending"}</p>
              </>
            )}
          </div>
          <div className="mt-5 grid gap-4 text-sm text-[#e8dcc8]/62 md:grid-cols-2">
            {fulfillmentType === "shipping" ? (
              <>
                <div className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                    Ship From Snapshot Preview
                  </p>
                  <p>{selectedOrigin?.company_name ?? "Pending"}</p>
                  <p>{selectedOrigin?.address1 || "Address pending"}</p>
                  <p>
                    {[selectedOrigin?.city, selectedOrigin?.state, selectedOrigin?.postal_code]
                      .filter(Boolean)
                      .join(", ") || "City / State / ZIP pending"}
                  </p>
                </div>
                <div className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                    Ship To Snapshot Preview
                  </p>
                  <p>{shippingAddress.company || "Pending"}</p>
                  <p>{shippingAddress.address1 || "Address pending"}</p>
                  <p>
                    {[shippingAddress.city, shippingAddress.state, shippingAddress.postal_code]
                      .filter(Boolean)
                      .join(", ") || "City / State / ZIP pending"}
                  </p>
                </div>
              </>
            ) : (
              <div className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 md:col-span-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                  Local Pickup Preview
                </p>
                <p>Local pickup contact: {selectedOrder?.customer ?? "Pending"}</p>
                <p>Pickup contact: {pickupContact || "Pending"}</p>
                <p>Instructions: {pickupInstructions || "Pending"}</p>
              </div>
            )}
          </div>
          {fulfillmentType === "shipping" ? (
            <div className="mt-5 grid gap-3 text-sm text-[#e8dcc8]/62 md:grid-cols-2">
              {packages.map((packageInput) => (
                <div
                  key={packageInput.package_number}
                  className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
                >
                  <p className="font-serif text-lg text-[#f7ead2]">
                    {packageInput.package_number || "Package"}
                  </p>
                  <p className="mt-2">
                    Weight: {packageInput.weight_lb ?? "Pending"} lb
                  </p>
                  <p className="mt-2">
                    Dimensions: {packageInput.length_in ?? "-"} x{" "}
                    {packageInput.width_in ?? "-"} x{" "}
                    {packageInput.height_in ?? "-"} in
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {renderStepErrors(6)}
          <label className="mt-5 block">
            <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className={`${inputClass} mt-2 py-3`}
            />
          </label>
          {renderNavigation(undefined, undefined, { showBack: true, create: true })}
        </section>
      ) : null}

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
