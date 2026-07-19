"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { PublicOrderConfirmation } from "@/lib/types/publicCheckout";

type OrderConfirmationPageContentProps = {
  order: PublicOrderConfirmation | null;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export default function OrderConfirmationPageContent({
  order,
}: OrderConfirmationPageContentProps) {
  const { t } = useLanguage();

  if (!order) {
    return (
      <main className="min-h-screen bg-[#0f0b07] px-6 pb-24 pt-32 sm:px-8 lg:px-10">
        <section className="mx-auto max-w-3xl border border-[#f7ead2]/10 bg-[#120d08] px-8 py-14 text-center">
          <h1 className="font-serif text-4xl text-[#f7ead2]">
            {t.storefront.confirmation.notFoundTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#e8dcc8]/68">
            {t.storefront.confirmation.notFoundDescription}
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
      <div className="mx-auto w-full max-w-5xl">
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-8">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
            {t.storefront.confirmation.label}
          </p>
          <h1 className="font-serif text-5xl font-semibold text-[#f7ead2]">
            {t.storefront.confirmation.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#e8dcc8]/70">
            {t.storefront.confirmation.description}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              [t.storefront.confirmation.orderNumber, order.orderNumber],
              [t.storefront.confirmation.email, order.customerEmail ?? "N/A"],
              [t.storefront.confirmation.paymentStatus, order.paymentStatus],
              [t.storefront.confirmation.orderStatus, order.orderStatus],
              [t.storefront.confirmation.date, formatDate(order.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                  {label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#f7ead2]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 border border-[#f7ead2]/10 bg-[#120d08] p-8">
          <h2 className="font-serif text-3xl text-[#f7ead2]">
            {t.storefront.confirmation.items}
          </h2>
          <div className="mt-6 space-y-4">
            {order.items.map((item) => (
              <div
                key={`${item.productId}-${item.sku}`}
                className="flex flex-wrap justify-between gap-4 border-b border-[#f7ead2]/10 pb-4 text-sm text-[#e8dcc8]/72"
              >
                <div>
                  <p className="font-semibold text-[#f7ead2]">{item.productName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#e8dcc8]/46">
                    {t.storefront.cart.sku}: {item.sku ?? "N/A"} /{" "}
                    {t.storefront.cart.quantity}: {item.quantity}
                  </p>
                </div>
                <p>{formatPrice(item.lineTotal)}</p>
              </div>
            ))}
          </div>
          <div className="ml-auto mt-6 max-w-sm space-y-3 text-sm text-[#e8dcc8]/72">
            <div className="flex justify-between">
              <span>{t.storefront.cart.subtotal}</span>
              <span>{formatPrice(order.summary.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.storefront.cart.tax}</span>
              <span>{formatPrice(order.summary.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.storefront.cart.shipping}</span>
              <span>{formatPrice(order.summary.shipping)}</span>
            </div>
            <div className="border-t border-[#f7ead2]/10 pt-4 text-lg font-semibold text-[#f7ead2]">
              <div className="flex justify-between">
                <span>{t.storefront.cart.total}</span>
                <span>{formatPrice(order.summary.total)}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
