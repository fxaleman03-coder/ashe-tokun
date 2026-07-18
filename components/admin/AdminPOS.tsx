"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { completePosSale } from "@/lib/data/posMutations";
import { launchContainment } from "@/lib/launchContainment";
import type {
  PosCartItem,
  PosCustomer,
  PosDataSource,
  PosInventoryLocation,
  PosProduct,
  PosSaleResult,
} from "@/lib/types/pos";
import {
  getCustomerContactName,
  getCustomerDisplaySummary,
  getCustomerPrimaryName,
  getCustomerTypeLabel,
} from "@/lib/utils/customerDisplay";

type AdminPOSProps = {
  products: PosProduct[];
  locations: PosInventoryLocation[];
  customer: PosCustomer;
  customers: PosCustomer[];
  nextOrderNumber: string;
  nextReceiptNumber: string;
  source: PosDataSource;
};

type DiscountType = "fixed" | "percentage";
type PaymentMethod = "cash" | "card" | "zelle" | "other";

const paymentMethods: PaymentMethod[] = ["cash", "card", "zelle", "other"];

const inputClass =
  "min-h-14 w-full border border-[#f7ead2]/10 bg-[#120d08] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/38 focus:border-[#d8a344]/70";

const buttonClass =
  "inline-flex min-h-12 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]";

const subtleButtonClass =
  "inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function parsePositiveNumber(value: string) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

function getAvailableAtLocation(product: PosProduct, locationId: string) {
  return (
    product.inventoryByLocation.find((item) => item.locationId === locationId)
      ?.availableQuantity ?? 0
  );
}

function makeCartItem(
  product: PosProduct,
  quantity: number,
  locationId: string,
): PosCartItem {
  const lineSubtotal = product.price * quantity;

  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    image: product.image,
    unitPrice: product.price,
    quantity,
    lineSubtotal,
    discountAmount: 0,
    taxAmount: 0,
    lineTotal: lineSubtotal,
    availableQuantity: getAvailableAtLocation(product, locationId),
    locationId,
    brand: product.brand,
  };
}

function getReceiptDateTime() {
  const now = new Date();

  return {
    date: now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export default function AdminPOS({
  products,
  locations,
  customer,
  customers,
  nextOrderNumber,
  nextReceiptNumber,
  source,
}: AdminPOSProps) {
  const { t } = useLanguage();
  const labels = t.admin.pos;
  const containmentLabels = t.admin.launchContainment;
  const getPaymentMethodLabel = (method: PaymentMethod | "") => {
    if (method === "cash") return labels.cash;
    if (method === "card") return labels.card;
    if (method === "other") return labels.other;
    if (method === "zelle") return "Zelle";

    return labels.pending;
  };
  const defaultLocation =
    locations.find((location) => location.name === "Retail Floor") ??
    locations.find((location) => location.name === "Main Stockroom") ??
    locations[0];
  const [selectedLocationId, setSelectedLocationId] = useState(
    defaultLocation?.id ?? "",
  );
  const [lookupValue, setLookupValue] = useState("");
  const [query, setQuery] = useState("");
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer>({
    id: customer.id,
    customerNumber: customer.customerNumber,
    name: customer.name,
    customerType: customer.customerType,
    firstName: customer.firstName,
    lastName: customer.lastName,
    companyName: customer.companyName,
    email: customer.email,
    phone: customer.phone,
    active: customer.active,
    orderCount: customer.orderCount,
    lifetimeValue: customer.lifetimeValue,
    source: customer.source,
  });
  const [customerQuery, setCustomerQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [taxRateValue, setTaxRateValue] = useState("7");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [amountTendered, setAmountTendered] = useState("");
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState<PosSaleResult | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [receiptDateTime] = useState(getReceiptDateTime);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      const searchable = [
        product.name,
        product.brand,
        product.sku,
        product.barcode,
        product.vendorSku,
        product.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [products, query]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = customerQuery.trim().toLowerCase();
    const activeCustomers = customers.filter((candidate) => candidate.active);

    if (!normalizedQuery) {
      return activeCustomers.slice(0, 8);
    }

    return activeCustomers
      .filter((candidate) => {
        const searchable = [
          candidate.name,
          candidate.customerNumber,
          candidate.customerType,
          candidate.companyName,
          getCustomerContactName(candidate),
          candidate.email,
          candidate.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [customerQuery, customers]);

  const subtotal = cartItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const cartItemCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const discountInput = parsePositiveNumber(discountValue);
  const rawDiscount =
    discountType === "percentage"
      ? subtotal * (Math.min(discountInput, 100) / 100)
      : discountInput;
  const discount = Math.min(rawDiscount, subtotal);
  const taxableAmount = Math.max(subtotal - discount, 0);
  const taxRate = parsePositiveNumber(taxRateValue);
  const tax = taxableAmount * (taxRate / 100);
  const total = taxableAmount + tax;
  const tendered = amountTendered ? parsePositiveNumber(amountTendered) : total;
  const changeDue =
    paymentMethod === "cash" ? Math.max(tendered - total, 0) : 0;

  function clearMessages() {
    setWarning("");
    setSuccess(null);
  }

  function revalidateCartForLocation(locationId: string) {
    setCartItems((currentItems) =>
      currentItems
        .map((item) => {
          const product = products.find(
            (candidate) => candidate.id === item.productId,
          );
          const availableQuantity = product
            ? getAvailableAtLocation(product, locationId)
            : 0;

          return {
            ...item,
            locationId,
            availableQuantity,
            quantity: Math.min(item.quantity, Math.max(availableQuantity, 1)),
          };
        })
        .filter((item) => item.availableQuantity > 0),
    );
  }

  function addProduct(product: PosProduct) {
    const availableQuantity = getAvailableAtLocation(product, selectedLocationId);

    if (availableQuantity <= 0) {
      setWarning(labels.notEnoughStock);
      setSuccess(null);
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.productId === product.id,
      );

      if (existingItem) {
        if (existingItem.quantity >= availableQuantity) {
          setWarning(labels.notEnoughStock);
          setSuccess(null);
          return currentItems;
        }

        return currentItems.map((item) =>
          item.productId === product.id
            ? makeCartItem(product, item.quantity + 1, selectedLocationId)
            : item,
        );
      }

      return [...currentItems, makeCartItem(product, 1, selectedLocationId)];
    });
    clearMessages();
  }

  function addLookupItem() {
    const normalizedLookup = lookupValue.trim().toLowerCase();

    if (!normalizedLookup) {
      setWarning(labels.productNotFound);
      setSuccess(null);
      return;
    }

    const matchedProduct = products.find(
      (product) =>
        product.sku.toLowerCase() === normalizedLookup ||
        product.barcode.toLowerCase() === normalizedLookup,
    );

    if (!matchedProduct) {
      setWarning(labels.productNotFound);
      setSuccess(null);
      return;
    }

    addProduct(matchedProduct);
    setLookupValue("");
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        if (nextQuantity > item.availableQuantity) {
          setWarning(labels.notEnoughStock);
          setSuccess(null);
          return item;
        }

        const product = products.find((candidate) => candidate.id === productId);

        return product
          ? makeCartItem(product, Math.max(1, nextQuantity), selectedLocationId)
          : item;
      }),
    );
  }

  function removeItem(productId: string) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId),
    );
  }

  function resetSale() {
    setCartItems([]);
    setDiscountType("fixed");
    setDiscountValue("");
    setTaxRateValue("7");
    setPaymentMethod("");
    setAmountTendered("");
  }

  function holdSale() {
    if (cartItems.length === 0) {
      return;
    }

    setSuccess({
      ok: true,
      source: "local",
      message: labels.heldMessage,
    });
    setWarning("");
  }

  function cancelSale() {
    if (cartItems.length === 0) {
      return;
    }

    const shouldCancel = window.confirm(labels.cancelConfirm);

    if (!shouldCancel) {
      return;
    }

    resetSale();
    setSuccess({
      ok: true,
      source: "local",
      message: labels.saleCanceled,
    });
    setWarning("");
  }

  async function completeSale() {
    if (launchContainment.posSaleCompletion) {
      setWarning(containmentLabels.posSaleCompletion);
      setSuccess(null);
      return;
    }

    if (cartItems.length === 0 || !paymentMethod) {
      return;
    }

    if (tendered < total) {
      setWarning(labels.tenderedWarning);
      setSuccess(null);
      return;
    }

    if (source === "Local fallback") {
      setSuccess({
        ok: true,
        source: "local",
        message: labels.localPreviewMessage,
      });
      setWarning("");
      return;
    }

    setIsCompleting(true);
    setWarning("");
    setSuccess(null);

    const result = await completePosSale({
      customerId: selectedCustomer.id,
      inventoryLocationId: selectedLocationId,
      cartItems,
      discountType,
      discountValue: discountInput,
      taxRate,
      paymentMethod,
      amountTendered: tendered,
      cashierName: "Admin",
      notes: labels.saleNotes,
    });

    setIsCompleting(false);

    if (!result.ok) {
      setWarning(result.error);
      return;
    }

    setSuccess(result);
  }

  function startNewSale() {
    resetSale();
    setSuccess(null);
    setWarning("");
    setLookupValue("");
    setQuery("");
    setCustomerQuery("");
    setIsCustomerSearchOpen(false);
    setSelectedCustomer({
      id: customer.id,
      customerNumber: customer.customerNumber,
      name: customer.name,
      customerType: customer.customerType,
      firstName: customer.firstName,
      lastName: customer.lastName,
      companyName: customer.companyName,
      email: customer.email,
      phone: customer.phone,
      active: customer.active,
      orderCount: customer.orderCount,
      lifetimeValue: customer.lifetimeValue,
      source: customer.source,
    });
  }

  const completedSale = success?.ok && success.source === "supabase" ? success : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(26rem,0.85fr)]">
      <section className="space-y-6">
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                {labels.barcodeSku}
              </p>
              <p className="mt-2 text-sm text-[#e8dcc8]/58">
                {labels.dataSource}: {source}
              </p>
            </div>
            <select
              value={selectedLocationId}
              onChange={(event) => {
                const nextLocationId = event.target.value;

                setSelectedLocationId(nextLocationId);
                revalidateCartForLocation(nextLocationId);
                clearMessages();
              }}
              className="min-h-12 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={lookupValue}
              onChange={(event) => setLookupValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addLookupItem();
                }
              }}
              placeholder={labels.scanPlaceholder}
              className={inputClass}
            />
            <button
              type="button"
              onClick={addLookupItem}
              className={buttonClass}
            >
              {labels.addItem}
            </button>
          </div>
          {warning ? (
            <p className="mt-4 border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
              {warning}
            </p>
          ) : null}
        </div>

        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                {labels.productLookup}
              </p>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
                {labels.liveCatalog}
              </h2>
            </div>
            <p className="text-sm text-[#e8dcc8]/58">
              {labels.productsAvailable.replace(
                "{count}",
                String(filteredProducts.length),
              )}
            </p>
          </div>

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.productSearchPlaceholder}
            className={`${inputClass} mt-5`}
          />

          <div className="mt-5 grid gap-3">
            {filteredProducts.map((product) => {
              const locationAvailable = getAvailableAtLocation(
                product,
                selectedLocationId,
              );

              return (
                <article
                  key={product.id}
                  className="grid gap-4 border border-[#f7ead2]/10 bg-[#0f0b07] p-3 transition duration-500 hover:border-[#d8a344]/50 hover:shadow-[0_24px_60px_rgba(0,0,0,0.28),0_0_28px_rgba(216,163,68,0.09)] lg:grid-cols-[5.25rem_1fr_auto]"
                >
                  <div className="relative h-20 w-20 overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
                    {product.image ? (
                      product.image.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.name}
                          className="absolute inset-0 h-full w-full object-contain p-2 drop-shadow-[0_14px_20px_rgba(0,0,0,0.54)]"
                        />
                      ) : (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="5rem"
                          className="object-contain p-2 drop-shadow-[0_14px_20px_rgba(0,0,0,0.54)]"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(216,163,68,0.2),transparent_38%),linear-gradient(135deg,#171008,#050302)]" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg font-semibold text-[#f7ead2]">
                        {product.name}
                      </h3>
                      <span className="border border-[#d8a344]/25 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                        {product.category}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-[#e8dcc8]/58 sm:grid-cols-2 xl:grid-cols-4">
                      <p>
                        <span className="text-[#d8a344]">{labels.brand}:</span>{" "}
                        {product.brand}
                      </p>
                      <p>
                        <span className="text-[#d8a344]">{labels.sku}:</span>{" "}
                        {product.sku}
                      </p>
                      <p>
                        <span className="text-[#d8a344]">
                          {labels.barcode}:
                        </span>{" "}
                        {product.barcode}
                      </p>
                      <p>
                        <span className="text-[#d8a344]">
                          {labels.available}:
                        </span>{" "}
                        {locationAvailable}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 lg:justify-end">
                    <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                      {formatCurrency(product.price)}
                    </p>
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={locationAvailable <= 0}
                      className={`${subtleButtonClass} disabled:cursor-not-allowed disabled:border-[#f7ead2]/8 disabled:text-[#e8dcc8]/28`}
                    >
                      {labels.addToCart}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          {(() => {
            const selectedCustomerDisplay =
              getCustomerDisplaySummary(selectedCustomer);

            return (
              <>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            {labels.customer}
          </p>
          <div className="mt-4 border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
            <p className="font-serif text-2xl font-semibold text-[#f7ead2]">
              {selectedCustomerDisplay.primaryName}
            </p>
            {selectedCustomerDisplay.contactName ? (
              <p className="mt-2 text-sm text-[#e8dcc8]/66">
                {labels.contact}: {selectedCustomerDisplay.contactName}
              </p>
            ) : null}
            <div className="mt-3 grid gap-2 text-xs leading-5 text-[#e8dcc8]/58">
              <p>
                <span className="text-[#d8a344]">{labels.number}:</span>{" "}
                {selectedCustomer.customerNumber}
              </p>
              <p className="capitalize">
                <span className="text-[#d8a344]">{labels.type}:</span>{" "}
                {selectedCustomerDisplay.typeLabel}
              </p>
              <p>
                <span className="text-[#d8a344]">{labels.orders}:</span>{" "}
                {selectedCustomer.orderCount}
              </p>
              <p>
                <span className="text-[#d8a344]">
                  {labels.lifetimeValue}:
                </span>{" "}
                {formatCurrency(selectedCustomer.lifetimeValue)}
              </p>
            </div>
          </div>
          <input
            type="search"
            value={customerQuery}
            onFocus={() => setIsCustomerSearchOpen(true)}
            onChange={(event) => {
              setCustomerQuery(event.target.value);
              setIsCustomerSearchOpen(true);
            }}
            placeholder={labels.customerSearchPlaceholder}
            className={`${inputClass} mt-4 min-h-11`}
          />
          {isCustomerSearchOpen || customerQuery ? (
            <div className="mt-3 max-h-64 overflow-y-auto border border-[#f7ead2]/10 bg-[#0f0b07]">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((candidate) => (
                  <button
                    key={candidate.id ?? candidate.customerNumber}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(candidate);
                      setCustomerQuery("");
                      setIsCustomerSearchOpen(false);
                      clearMessages();
                    }}
                    className="block w-full border-b border-[#f7ead2]/8 px-4 py-3 text-left text-sm text-[#e8dcc8]/72 transition last:border-b-0 hover:bg-[#d8a344]/10 hover:text-[#f7ead2]"
                  >
                    {(() => {
                      const candidateDisplay = getCustomerDisplaySummary(candidate);

                      return (
                        <>
                    <span className="block font-serif text-lg text-[#f7ead2]">
                      {candidateDisplay.primaryName}
                    </span>
                    {candidateDisplay.contactName ? (
                      <span className="mt-1 block text-xs text-[#e8dcc8]/58">
                        {labels.contact}: {candidateDisplay.contactName}
                      </span>
                    ) : null}
                    <span className="mt-1 block text-xs text-[#d8a344]">
                      {candidate.customerNumber} /{" "}
                      {getCustomerTypeLabel(candidate)}
                    </span>
                    <span className="mt-1 block text-xs text-[#e8dcc8]/48">
                      {candidate.orderCount} {labels.orders.toLowerCase()} /{" "}
                      {formatCurrency(candidate.lifetimeValue)}
                    </span>
                        </>
                      );
                    })()}
                  </button>
                ))
              ) : (
                <p className="px-4 py-4 text-sm text-[#e8dcc8]/54">
                  {labels.noActiveCustomers}
                </p>
              )}
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/admin/customers/new" className={subtleButtonClass}>
              {labels.newCustomer}
            </Link>
            <button
              type="button"
              onClick={() => setIsCustomerSearchOpen(true)}
              className={subtleButtonClass}
            >
              {labels.searchCustomer}
            </button>
            <Link href="/admin/returns/new" className={subtleButtonClass}>
              {labels.startReturn}
            </Link>
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer({
                  id: customer.id,
                  customerNumber: customer.customerNumber,
                  name: customer.name,
                  customerType: customer.customerType,
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  companyName: customer.companyName,
                  email: customer.email,
                  phone: customer.phone,
                  active: customer.active,
                  orderCount: customer.orderCount,
                  lifetimeValue: customer.lifetimeValue,
                  source: customer.source,
                });
                setCustomerQuery("");
                setIsCustomerSearchOpen(false);
              }}
              className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
            >
              {labels.returnToWalkIn}
            </button>
          </div>
              </>
            );
          })()}
        </div>

        <div className="border border-[#d8a344]/25 bg-[#120d08] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_40px_rgba(216,163,68,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                {labels.cart}
              </p>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
                {labels.items}: {cartItemCount}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetSale}
              disabled={cartItems.length === 0}
              className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/45 transition hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/24"
            >
              {labels.clearCart}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {cartItems.length === 0 ? (
              <div className="border border-dashed border-[#d8a344]/24 bg-[#0f0b07] p-6 text-sm leading-6 text-[#e8dcc8]/62">
                <p className="font-serif text-xl text-[#f7ead2]">
                  {labels.cartEmpty}
                </p>
                <p className="mt-2">
                  {labels.cartEmptyDescription}
                </p>
              </div>
            ) : (
              cartItems.map((item) => (
                <article
                  key={item.productId}
                  className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-[#f7ead2]">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#e8dcc8]/50">
                        {labels.sku} {item.sku} / {labels.available}{" "}
                        {item.availableQuantity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/45 transition hover:text-[#d8a344]"
                    >
                      {labels.remove}
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-[#e8dcc8]/62">
                      {formatCurrency(item.unitPrice)}
                    </p>
                    <div className="flex items-center border border-[#f7ead2]/10">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        className="h-9 w-9 text-[#f7ead2] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:text-[#e8dcc8]/24"
                      >
                        -
                      </button>
                      <span className="flex h-9 min-w-10 items-center justify-center border-x border-[#f7ead2]/10 text-sm text-[#f7ead2]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.availableQuantity}
                        className="h-9 w-9 text-[#f7ead2] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:text-[#e8dcc8]/24"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-serif text-lg font-semibold text-[#f7ead2]">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-[#f7ead2]/10 pt-5 text-sm text-[#e8dcc8]/68">
            <div className="flex justify-between gap-4">
              <span>{labels.subtotal}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <label>
                <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                  {labels.discountType}
                </span>
                <select
                  value={discountType}
                  onChange={(event) =>
                    setDiscountType(event.target.value as DiscountType)
                  }
                  className="mt-2 min-h-10 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
                >
                  <option value="fixed">{labels.amount}</option>
                  <option value="percentage">{labels.percent}</option>
                </select>
              </label>
              <label>
                <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                  {labels.value}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  placeholder={discountType === "percentage" ? "0%" : "0.00"}
                  className="mt-2 min-h-10 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-right text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
                />
              </label>
            </div>
            <div className="flex justify-between gap-4 text-[#e8dcc8]/52">
              <span>{labels.discountApplied}</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            <label className="grid gap-2 sm:grid-cols-[1fr_8rem] sm:items-center">
              <span>{labels.taxPercentage}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxRateValue}
                onChange={(event) => setTaxRateValue(event.target.value)}
                placeholder="0"
                className="min-h-10 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-right text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
              />
            </label>
            <div className="flex justify-between gap-4 text-[#e8dcc8]/52">
              <span>{labels.tax}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#f7ead2]/10 pt-4 font-serif text-2xl font-semibold text-[#f7ead2]">
              <span>{labels.total}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            {labels.payment}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setPaymentMethod(method);
                  setSuccess(null);
                }}
                className={`inline-flex min-h-12 items-center justify-center border px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] transition duration-500 ${
                  paymentMethod === method
                    ? "border-[#d8a344] bg-[#d8a344] text-[#0f0b07] shadow-[0_0_30px_rgba(216,163,68,0.22)]"
                    : "border-[#f7ead2]/12 text-[#f7ead2] hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                }`}
              >
                {method === "cash"
                  ? labels.cash
                  : method === "card"
                    ? labels.card
                    : method === "other"
                      ? labels.other
                      : "Zelle"}
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
              {labels.amountTendered}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountTendered}
              onChange={(event) => setAmountTendered(event.target.value)}
              placeholder={total.toFixed(2)}
              className={`${inputClass} mt-2 text-right`}
            />
          </label>
          <div className="mt-3 flex justify-between gap-4 text-sm text-[#e8dcc8]/62">
            <span>{labels.changeDue}</span>
            <span>{formatCurrency(changeDue)}</span>
          </div>
          {launchContainment.posSaleCompletion ? (
            <p className="mt-4 border border-[#d8a344]/25 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#e8dcc8]/70">
              {containmentLabels.posSaleCompletion}
            </p>
          ) : null}
          <button
            type="button"
            onClick={completeSale}
            disabled={
              launchContainment.posSaleCompletion ||
              cartItems.length === 0 ||
              !paymentMethod ||
              isCompleting ||
              tendered < total
            }
            className="mt-5 inline-flex min-h-13 w-full items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-5 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:shadow-[0_0_36px_rgba(216,163,68,0.26)] disabled:cursor-not-allowed disabled:border-[#f7ead2]/10 disabled:bg-[#f7ead2]/8 disabled:text-[#e8dcc8]/34 disabled:shadow-none"
          >
            {launchContainment.posSaleCompletion
              ? containmentLabels.actionUnavailable
              : isCompleting
                ? labels.completing
                : labels.completeSale}
          </button>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={holdSale}
              disabled={cartItems.length === 0}
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:border-[#f7ead2]/8 disabled:text-[#e8dcc8]/28"
            >
              {labels.holdSale}
            </button>
            <button
              type="button"
              onClick={cancelSale}
              disabled={cartItems.length === 0}
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:border-[#f7ead2]/8 disabled:text-[#e8dcc8]/28"
            >
              {labels.cancelSale}
            </button>
          </div>
          {success ? (
            <div className="mt-4 border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#d8a344]">
              {success.ok && success.source === "supabase" ? (
                <div className="space-y-1">
                  <p>{labels.saleCompleted}</p>
                  <p>
                    {labels.order}: {success.orderNumber}
                  </p>
                  <p>
                    {labels.receipt}: {success.receiptNumber}
                  </p>
                  <p>
                    {labels.paymentStatus}: {success.paymentStatus}
                  </p>
                  <p>
                    {labels.totalPaid}: {formatCurrency(success.total)}
                  </p>
                  <p>
                    {labels.changeDue}: {formatCurrency(success.changeDue)}
                  </p>
                  <p>{labels.inventoryUpdated}</p>
                </div>
              ) : success.ok ? (
                <p>{success.message}</p>
              ) : null}
            </div>
          ) : null}
          {completedSale ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={startNewSale} className={buttonClass}>
                {labels.newSale}
              </button>
              <Link
                href={`/admin/orders/${completedSale.orderId}`}
                className={buttonClass}
              >
                {labels.viewOrder}
              </Link>
              <button type="button" className={subtleButtonClass}>
                {labels.printReceipt}
              </button>
            </div>
          ) : null}
          <p className="mt-4 text-xs leading-5 text-[#e8dcc8]/50">
            {labels.productionNotice}
          </p>
        </div>

        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            {labels.receiptPreview}
          </p>
          <div className="mt-4 border border-[#f7ead2]/10 bg-[#0f0b07] p-5 text-sm text-[#e8dcc8]/68">
            <div className="border-b border-[#f7ead2]/10 pb-4 text-center">
              <p className="font-serif text-2xl font-semibold tracking-[0.18em] text-[#f7ead2]">
                ASHE TOKUN
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                {completedSale?.receiptNumber ??
                  nextReceiptNumber ??
                  labels.pending}
              </p>
              <p className="mt-1 text-xs text-[#e8dcc8]/46">
                {labels.order}{" "}
                {completedSale?.orderNumber ?? nextOrderNumber ?? labels.pending}
              </p>
            </div>
            <dl className="mt-4 grid gap-2 border-b border-[#f7ead2]/10 pb-4 text-xs sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-[#d8a344]">{labels.date}</dt>
                <dd className="mt-1 text-[#f7ead2]">{receiptDateTime.date}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-[#d8a344]">{labels.time}</dt>
                <dd className="mt-1 text-[#f7ead2]">{receiptDateTime.time}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-[#d8a344]">{labels.cashier}</dt>
                <dd className="mt-1 text-[#f7ead2]">Admin</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-[#d8a344]">{labels.customer}</dt>
                <dd className="mt-1 text-[#f7ead2]">
                  {getCustomerPrimaryName(selectedCustomer)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 space-y-3">
              {cartItems.length === 0 ? (
                <p className="text-center text-[#e8dcc8]/46">
                  {labels.noReceiptItems}
                </p>
              ) : (
                cartItems.map((item) => (
                  <div key={item.productId} className="grid grid-cols-[1fr_auto] gap-4">
                    <div>
                      <p className="text-[#f7ead2]">{item.name}</p>
                      <p className="mt-1 text-xs text-[#d8a344]">{item.brand}</p>
                      <p className="mt-1 text-xs text-[#e8dcc8]/42">
                        {labels.sku} {item.sku}
                      </p>
                      <p className="mt-1 text-xs text-[#e8dcc8]/42">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p>{formatCurrency(item.unitPrice * item.quantity)}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-5 space-y-2 border-t border-[#f7ead2]/10 pt-4">
              <div className="flex justify-between gap-4">
                <span>{labels.subtotal}</span>
                <span>{formatCurrency(completedSale?.subtotal ?? subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{labels.discount}</span>
                <span>
                  -{formatCurrency(completedSale?.discountAmount ?? discount)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{labels.tax}</span>
                <span>{formatCurrency(completedSale?.taxAmount ?? tax)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-[#f7ead2]/10 pt-3 font-serif text-xl font-semibold text-[#f7ead2]">
                <span>{labels.total}</span>
                <span>{formatCurrency(completedSale?.total ?? total)}</span>
              </div>
              <div className="flex justify-between gap-4 pt-2">
                <span>{labels.payment}</span>
                <span>{getPaymentMethodLabel(paymentMethod)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{labels.amountTendered}</span>
                <span>
                  {formatCurrency(completedSale?.amountTendered ?? tendered)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{labels.changeDue}</span>
                <span>{formatCurrency(completedSale?.changeDue ?? changeDue)}</span>
              </div>
            </div>
            <p className="mt-5 border-t border-[#f7ead2]/10 pt-4 text-xs leading-5 text-[#e8dcc8]/46">
              {labels.receiptDeferred}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
