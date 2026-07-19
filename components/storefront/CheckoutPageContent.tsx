"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCart } from "@/components/storefront/CartProvider";
import { createPublicCheckoutOrder } from "@/lib/data/publicCheckoutMutations";
import type { Product } from "@/lib/products";
import type { PublicCheckoutAddress } from "@/lib/types/publicCheckout";

type CheckoutPageContentProps = {
  products: Product[];
};

type AddressState = PublicCheckoutAddress;

const emptyAddress: AddressState = {
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function CheckoutPageContent({ products }: CheckoutPageContentProps) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { items, clearCart } = useCart();
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [billingAddress, setBillingAddress] =
    useState<AddressState>(emptyAddress);
  const [shippingAddress, setShippingAddress] =
    useState<AddressState>(emptyAddress);
  const [orderNotes, setOrderNotes] = useState("");
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const lines = items
    .map((item) => ({
      cartItem: item,
      product: productsById.get(item.productId) ?? null,
    }))
    .filter((line) => line.product?.inStock);
  const subtotal = lines.reduce(
    (total, line) => total + (line.product?.price ?? 0) * line.cartItem.quantity,
    0,
  );

  function updateCustomer(field: keyof typeof customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function updateAddress(
    type: "billing" | "shipping",
    field: keyof AddressState,
    value: string,
  ) {
    const setter = type === "billing" ? setBillingAddress : setShippingAddress;
    setter((current) => ({ ...current, [field]: value }));
  }

  function getError(field: string) {
    return fieldErrors[field] ? (
      <p className="mt-2 text-xs font-semibold text-[#f4a6a6]">
        {fieldErrors[field]}
      </p>
    ) : null;
  }

  function renderInput(
    label: string,
    value: string,
    onChange: (value: string) => void,
    field: string,
    type = "text",
  ) {
    return (
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344]">
          {label}
        </span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-12 w-full border border-[#f7ead2]/14 bg-[#0f0b07] px-4 text-[#f7ead2] outline-none transition focus:border-[#d8a344]"
        />
        {getError(field)}
      </label>
    );
  }

  function renderAddress(type: "billing" | "shipping", address: AddressState) {
    const prefix = type;

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {renderInput(t.storefront.checkout.firstName, address.firstName, (value) =>
          updateAddress(type, "firstName", value),
        `${prefix}.firstName`)}
        {renderInput(t.storefront.checkout.lastName, address.lastName, (value) =>
          updateAddress(type, "lastName", value),
        `${prefix}.lastName`)}
        <div className="sm:col-span-2">
          {renderInput(t.storefront.checkout.address1, address.address1, (value) =>
            updateAddress(type, "address1", value),
          `${prefix}.address1`)}
        </div>
        <div className="sm:col-span-2">
          {renderInput(t.storefront.checkout.address2, address.address2 ?? "", (value) =>
            updateAddress(type, "address2", value),
          `${prefix}.address2`)}
        </div>
        {renderInput(t.storefront.checkout.city, address.city, (value) =>
          updateAddress(type, "city", value),
        `${prefix}.city`)}
        {renderInput(t.storefront.checkout.state, address.state, (value) =>
          updateAddress(type, "state", value),
        `${prefix}.state`)}
        {renderInput(t.storefront.checkout.postalCode, address.postalCode, (value) =>
          updateAddress(type, "postalCode", value),
        `${prefix}.postalCode`)}
        {renderInput(t.storefront.checkout.country, address.country, (value) =>
          updateAddress(type, "country", value),
        `${prefix}.country`)}
      </div>
    );
  }

  function handleSubmit() {
    setFormError(null);
    setFieldErrors({});

    const idempotencyKey =
      window.sessionStorage.getItem("ashe-tokun-checkout-idempotency") ??
      createIdempotencyKey();

    window.sessionStorage.setItem(
      "ashe-tokun-checkout-idempotency",
      idempotencyKey,
    );

    const payload = {
      idempotencyKey,
      cartItems: items,
      customer,
      billingAddress,
      shippingAddress: sameAsBilling ? billingAddress : shippingAddress,
      sameAsBilling,
      orderNotes,
    };

    setIsPending(true);
    startTransition(async () => {
      const result = await createPublicCheckoutOrder(payload);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setIsPending(false);
        return;
      }

      window.sessionStorage.removeItem("ashe-tokun-checkout-idempotency");
      clearCart();
      router.push(
        `/order-confirmation/${result.orderNumber}?key=${encodeURIComponent(
          result.confirmationToken,
        )}`,
      );
    });
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#0f0b07] px-6 pb-24 pt-32 sm:px-8 lg:px-10">
        <section className="mx-auto max-w-3xl border border-[#f7ead2]/10 bg-[#120d08] px-8 py-14 text-center">
          <h1 className="font-serif text-4xl text-[#f7ead2]">
            {t.storefront.cart.emptyTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#e8dcc8]/68">
            {t.storefront.cart.emptyDescription}
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07]"
          >
            {t.storefront.cart.continueShopping}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0b07] px-6 pb-24 pt-32 sm:px-8 lg:px-10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1fr_24rem]">
        <section className="space-y-6">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
              {t.storefront.checkout.label}
            </p>
            <h1 className="font-serif text-5xl font-semibold text-[#f7ead2]">
              {t.storefront.checkout.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#e8dcc8]/70">
              {t.storefront.checkout.description}
            </p>
          </div>

          {formError ? (
            <div className="border border-[#f4a6a6]/35 bg-[#2a0f0f] px-5 py-4 text-sm text-[#f4caca]">
              {formError}
            </div>
          ) : null}

          <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6">
            <h2 className="font-serif text-3xl text-[#f7ead2]">
              {t.storefront.checkout.contact}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {renderInput(t.storefront.checkout.firstName, customer.firstName, (value) =>
                updateCustomer("firstName", value),
              "firstName")}
              {renderInput(t.storefront.checkout.lastName, customer.lastName, (value) =>
                updateCustomer("lastName", value),
              "lastName")}
              {renderInput(t.storefront.checkout.email, customer.email, (value) =>
                updateCustomer("email", value),
              "email", "email")}
              {renderInput(t.storefront.checkout.phone, customer.phone, (value) =>
                updateCustomer("phone", value),
              "phone", "tel")}
            </div>
          </section>

          <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6">
            <h2 className="font-serif text-3xl text-[#f7ead2]">
              {t.storefront.checkout.billingAddress}
            </h2>
            <div className="mt-6">{renderAddress("billing", billingAddress)}</div>
          </section>

          <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-serif text-3xl text-[#f7ead2]">
                {t.storefront.checkout.shippingAddress}
              </h2>
              <label className="inline-flex items-center gap-3 text-sm text-[#e8dcc8]/72">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(event) => setSameAsBilling(event.target.checked)}
                  className="h-4 w-4 accent-[#d8a344]"
                />
                {t.storefront.checkout.sameAsBilling}
              </label>
            </div>
            {!sameAsBilling ? (
              <div className="mt-6">
                {renderAddress("shipping", shippingAddress)}
              </div>
            ) : null}
          </section>

          <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                {t.storefront.checkout.orderNotes}
              </span>
              <textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                rows={4}
                className="mt-2 w-full border border-[#f7ead2]/14 bg-[#0f0b07] px-4 py-3 text-[#f7ead2] outline-none transition focus:border-[#d8a344]"
              />
            </label>
          </section>
        </section>

        <aside className="h-fit border border-[#f7ead2]/10 bg-[#120d08] p-6">
          <h2 className="font-serif text-3xl text-[#f7ead2]">
            {t.storefront.checkout.orderSummary}
          </h2>
          <div className="mt-6 space-y-4">
            {lines.map(({ cartItem, product }) => (
              <div
                key={cartItem.productId}
                className="border-b border-[#f7ead2]/10 pb-4 text-sm text-[#e8dcc8]/72"
              >
                <div className="flex justify-between gap-4">
                  <span>{product?.name[language]}</span>
                  <span>{formatPrice((product?.price ?? 0) * cartItem.quantity)}</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#e8dcc8]/46">
                  {cartItem.quantity} x {formatPrice(product?.price ?? 0)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3 text-sm text-[#e8dcc8]/72">
            <div className="flex justify-between">
              <span>{t.storefront.cart.subtotal}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.storefront.cart.tax}</span>
              <span>{formatPrice(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.storefront.cart.shipping}</span>
              <span>{formatPrice(0)}</span>
            </div>
            <div className="border-t border-[#f7ead2]/10 pt-4 text-lg font-semibold text-[#f7ead2]">
              <div className="flex justify-between">
                <span>{t.storefront.cart.total}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>
            <p className="text-xs leading-5 text-[#e8dcc8]/56">
              {t.storefront.checkout.paymentNotice}
            </p>
          </div>
          <button
            type="button"
            disabled={isPending || lines.length === 0}
            onClick={handleSubmit}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center bg-[#d8a344] px-5 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition hover:bg-[#f0c062] disabled:cursor-not-allowed disabled:bg-[#d8a344]/35 disabled:text-[#0f0b07]/60"
          >
            {isPending
              ? t.storefront.checkout.submitting
              : t.storefront.checkout.submitOrder}
          </button>
        </aside>
      </div>
    </main>
  );
}
