"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import { useProductCatalog } from "@/lib/productStore";

type CartItem = {
  product: Product;
  quantity: number;
};

type DiscountType = "amount" | "percent";

const paymentMethods = ["Cash", "Card", "Zelle", "Other", "Split Payment"];
const defaultCustomer = "Walk-in Customer";
const receiptNumber = "Receipt #100001";

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

function getProductLabel(product: Product) {
  return product.name.en;
}

function getLocalizedLabel(value: Product["category"]) {
  return value.en;
}

function parsePositiveNumber(value: string) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

export default function AdminPOS() {
  const products = useProductCatalog();
  const [lookupValue, setLookupValue] = useState("");
  const [query, setQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [taxRateValue, setTaxRateValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [warning, setWarning] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [receiptDateTime, setReceiptDateTime] = useState({
    date: "Pending",
    time: "Pending",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();

      setReceiptDateTime({
        date: now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      const searchable = [
        product.name.en,
        product.vendor,
        product.sku,
        product.barcode,
        product.vendorSku,
        product.category.en,
        product.tradition.en,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [products, query]);

  const subtotal = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const cartItemCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const discountInput = parsePositiveNumber(discountValue);
  const rawDiscount =
    discountType === "percent"
      ? subtotal * (Math.min(discountInput, 100) / 100)
      : discountInput;
  const discount = Math.min(rawDiscount, subtotal);
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = taxableAmount * (parsePositiveNumber(taxRateValue) / 100);
  const total = taxableAmount + tax;

  function addProduct(product: Product) {
    if (product.stock <= 0) {
      setWarning("Not enough stock available.");
      setSuccessMessage("");
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.slug === product.slug,
      );

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          setWarning("Not enough stock available.");
          setSuccessMessage("");
          return currentItems;
        }

        return currentItems.map((item) =>
          item.product.slug === product.slug
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentItems, { product, quantity: 1 }];
    });
    setWarning("");
    setSuccessMessage("");
  }

  function addLookupItem() {
    const normalizedLookup = lookupValue.trim().toLowerCase();

    if (!normalizedLookup) {
      setWarning("Product not found.");
      setSuccessMessage("");
      return;
    }

    const matchedProduct = products.find(
      (product) =>
        product.sku.toLowerCase() === normalizedLookup ||
        product.barcode.toLowerCase() === normalizedLookup,
    );

    if (!matchedProduct) {
      setWarning("Product not found.");
      setSuccessMessage("");
      return;
    }

    addProduct(matchedProduct);
    setLookupValue("");
  }

  function updateQuantity(slug: string, nextQuantity: number) {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.product.slug !== slug) {
          return item;
        }

        if (nextQuantity > item.product.stock) {
          setWarning("Not enough stock available.");
          setSuccessMessage("");
          return item;
        }

        return { ...item, quantity: Math.max(1, nextQuantity) };
      }),
    );
  }

  function removeItem(slug: string) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.product.slug !== slug),
    );
  }

  function completeSalePreview() {
    if (cartItems.length === 0 || !paymentMethod) {
      return;
    }

    setSuccessMessage(
      "Sale preview completed locally. Inventory deduction and payment processing will be connected in a future phase.",
    );
    setWarning("");
  }

  function holdSale() {
    if (cartItems.length === 0) {
      return;
    }

    setSuccessMessage(
      "Sale held locally. Resume sale will be connected in a future database phase.",
    );
    setWarning("");
  }

  function resetSale() {
    setCartItems([]);
    setDiscountType("amount");
    setDiscountValue("");
    setTaxRateValue("");
    setPaymentMethod("");
  }

  function cancelSale() {
    if (cartItems.length === 0) {
      return;
    }

    const shouldCancel = window.confirm("Cancel this local sale preview?");

    if (!shouldCancel) {
      return;
    }

    resetSale();
    setSuccessMessage("Sale canceled.");
    setWarning("");
  }

  function startNewSale() {
    resetSale();
    setSuccessMessage("");
    setWarning("");
    setLookupValue("");
    setQuery("");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(26rem,0.85fr)]">
      <section className="space-y-6">
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Barcode / SKU
          </p>
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
              placeholder="Scan barcode or enter SKU"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addLookupItem}
              className={buttonClass}
            >
              Add Item
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
                Product Lookup
              </p>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
                Local Catalog
              </h2>
            </div>
            <p className="text-sm text-[#e8dcc8]/58">
              {filteredProducts.length} products available
            </p>
          </div>

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by product name, SKU, vendor, or barcode"
            className={`${inputClass} mt-5`}
          />

          <div className="mt-5 grid gap-3">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="grid gap-4 border border-[#f7ead2]/10 bg-[#0f0b07] p-3 transition duration-500 hover:border-[#d8a344]/50 hover:shadow-[0_24px_60px_rgba(0,0,0,0.28),0_0_28px_rgba(216,163,68,0.09)] lg:grid-cols-[5.25rem_1fr_auto]"
              >
                <div className="relative h-20 w-20 overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={getProductLabel(product)}
                      fill
                      sizes="5rem"
                      className="object-contain p-2 drop-shadow-[0_14px_20px_rgba(0,0,0,0.54)]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(216,163,68,0.2),transparent_38%),linear-gradient(135deg,#171008,#050302)]" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-lg font-semibold text-[#f7ead2]">
                      {getProductLabel(product)}
                    </h3>
                    <span className="border border-[#d8a344]/25 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                      {getLocalizedLabel(product.category)}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-[#e8dcc8]/58 sm:grid-cols-2 xl:grid-cols-4">
                    <p>
                      <span className="text-[#d8a344]">Vendor:</span>{" "}
                      {product.vendor}
                    </p>
                    <p>
                      <span className="text-[#d8a344]">SKU:</span>{" "}
                      {product.sku}
                    </p>
                    <p>
                      <span className="text-[#d8a344]">Barcode:</span>{" "}
                      {product.barcode}
                    </p>
                    <p>
                      <span className="text-[#d8a344]">Stock:</span>{" "}
                      {product.stock}
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
                    className={subtleButtonClass}
                  >
                    Add to Cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Customer
          </p>
          <div className="mt-4 border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
            <p className="font-serif text-2xl font-semibold text-[#f7ead2]">
              {defaultCustomer}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#e8dcc8]/52">
              Customer profiles and sale history will connect in a future phase.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className={subtleButtonClass}>
              Add Customer
            </button>
            <button type="button" className={subtleButtonClass}>
              Search Customer
            </button>
          </div>
        </div>

        <div className="border border-[#d8a344]/25 bg-[#120d08] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_40px_rgba(216,163,68,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Cart
              </p>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
                Items: {cartItemCount}
              </h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center border border-[#d8a344]/25 font-serif text-sm text-[#d8a344]">
              {cartItemCount}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {cartItems.length === 0 ? (
              <div className="border border-dashed border-[#d8a344]/24 bg-[#0f0b07] p-6 text-sm leading-6 text-[#e8dcc8]/62">
                <p className="font-serif text-xl text-[#f7ead2]">
                  Cart is empty
                </p>
                <p className="mt-2">
                  Scan a SKU, enter a barcode, or add an item from the local
                  catalog to begin a sale preview.
                </p>
              </div>
            ) : (
              cartItems.map((item) => (
                <article
                  key={item.product.slug}
                  className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-[#f7ead2]">
                        {getProductLabel(item.product)}
                      </h3>
                      <p className="mt-1 text-xs text-[#e8dcc8]/50">
                        SKU {item.product.sku}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.slug)}
                      className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/45 transition hover:text-[#d8a344]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-[#e8dcc8]/62">
                      {formatCurrency(item.product.price)}
                    </p>
                    <div className="flex items-center border border-[#f7ead2]/10">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.slug, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        className="h-9 w-9 text-[#f7ead2] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        -
                      </button>
                      <span className="flex h-9 min-w-10 items-center justify-center border-x border-[#f7ead2]/10 text-sm text-[#f7ead2]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.slug, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.product.stock}
                        className="h-9 w-9 text-[#f7ead2] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-serif text-lg font-semibold text-[#f7ead2]">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-[#f7ead2]/10 pt-5 text-sm text-[#e8dcc8]/68">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <label>
                <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                  Discount Type
                </span>
                <select
                  value={discountType}
                  onChange={(event) =>
                    setDiscountType(event.target.value as DiscountType)
                  }
                  className="mt-2 min-h-10 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
                >
                  <option value="amount">Amount</option>
                  <option value="percent">Percent</option>
                </select>
              </label>
              <label>
                <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                  Value
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  placeholder={discountType === "percent" ? "0%" : "0.00"}
                  className="mt-2 min-h-10 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-right text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
                />
              </label>
            </div>
            <div className="flex justify-between gap-4 text-[#e8dcc8]/52">
              <span>Discount applied</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            <label className="grid gap-2 sm:grid-cols-[1fr_8rem] sm:items-center">
              <span>Tax percentage</span>
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
              <span>Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#f7ead2]/10 pt-4 font-serif text-2xl font-semibold text-[#f7ead2]">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Payment
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setPaymentMethod(method);
                  setSuccessMessage("");
                }}
                className={`inline-flex min-h-12 items-center justify-center border px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] transition duration-500 ${
                  paymentMethod === method
                    ? "border-[#d8a344] bg-[#d8a344] text-[#0f0b07] shadow-[0_0_30px_rgba(216,163,68,0.22)]"
                    : "border-[#f7ead2]/12 text-[#f7ead2] hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
          {paymentMethod === "Split Payment" ? (
            <p className="mt-4 border border-[#d8a344]/25 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#d8a344]">
              Split payment will be connected in a future phase.
            </p>
          ) : null}
          <button
            type="button"
            onClick={completeSalePreview}
            disabled={cartItems.length === 0 || !paymentMethod}
            className="mt-5 inline-flex min-h-13 w-full items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-5 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 hover:shadow-[0_0_36px_rgba(216,163,68,0.26)] disabled:cursor-not-allowed disabled:border-[#f7ead2]/10 disabled:bg-[#f7ead2]/8 disabled:text-[#e8dcc8]/34 disabled:shadow-none"
          >
            Complete Sale
          </button>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={holdSale}
              disabled={cartItems.length === 0}
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:border-[#f7ead2]/8 disabled:text-[#e8dcc8]/28"
            >
              Hold Sale
            </button>
            <button
              type="button"
              onClick={cancelSale}
              disabled={cartItems.length === 0}
              className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:border-[#f7ead2]/8 disabled:text-[#e8dcc8]/28"
            >
              Cancel Sale
            </button>
          </div>
          {successMessage ? (
            <p className="mt-4 border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#d8a344]">
              {successMessage}
            </p>
          ) : null}
          {successMessage.includes("Sale preview completed locally") ? (
            <button
              type="button"
              onClick={startNewSale}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
            >
              Start New Sale
            </button>
          ) : null}
          <p className="mt-4 text-xs leading-5 text-[#e8dcc8]/50">
            Inventory deduction will be connected after database integration.
          </p>
        </div>

        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Receipt Preview
          </p>
          <div className="mt-4 border border-[#f7ead2]/10 bg-[#0f0b07] p-5 text-sm text-[#e8dcc8]/68">
            <div className="border-b border-[#f7ead2]/10 pb-4 text-center">
              <p className="font-serif text-2xl font-semibold tracking-[0.18em] text-[#f7ead2]">
                ASHE TOKUN
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                {receiptNumber}
              </p>
            </div>
            <dl className="mt-4 grid gap-2 border-b border-[#f7ead2]/10 pb-4 text-xs sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-[#d8a344]">Date</dt>
                <dd className="mt-1 text-[#f7ead2]">{receiptDateTime.date}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-[#d8a344]">Time</dt>
                <dd className="mt-1 text-[#f7ead2]">{receiptDateTime.time}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-[#d8a344]">Cashier</dt>
                <dd className="mt-1 text-[#f7ead2]">Admin</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-[#d8a344]">Customer</dt>
                <dd className="mt-1 text-[#f7ead2]">{defaultCustomer}</dd>
              </div>
            </dl>
            <div className="mt-4 space-y-3">
              {cartItems.length === 0 ? (
                <p className="text-center text-[#e8dcc8]/46">
                  No receipt items yet.
                </p>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product.slug}
                    className="grid grid-cols-[1fr_auto] gap-4"
                  >
                    <div>
                      <p className="text-[#f7ead2]">
                        {getProductLabel(item.product)}
                      </p>
                      <p className="mt-1 text-xs text-[#d8a344]">
                        {item.product.vendor}
                      </p>
                      <p className="mt-1 text-xs text-[#e8dcc8]/42">
                        SKU {item.product.sku}
                      </p>
                      <p className="mt-1 text-xs text-[#e8dcc8]/42">
                        {item.quantity} x {formatCurrency(item.product.price)}
                      </p>
                    </div>
                    <p>{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-5 space-y-2 border-t border-[#f7ead2]/10 pt-4">
              <div className="flex justify-between gap-4">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Tax</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-[#f7ead2]/10 pt-3 font-serif text-xl font-semibold text-[#f7ead2]">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between gap-4 pt-2">
                <span>Payment</span>
                <span>{paymentMethod || "Pending"}</span>
              </div>
            </div>
            <p className="mt-5 border-t border-[#f7ead2]/10 pt-4 text-xs leading-5 text-[#e8dcc8]/46">
              Receipt printing will be connected in a future phase.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
