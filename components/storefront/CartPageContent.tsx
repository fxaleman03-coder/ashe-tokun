"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCart } from "@/components/storefront/CartProvider";
import type { Product } from "@/lib/products";

type CartPageContentProps = {
  products: Product[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export default function CartPageContent({ products }: CartPageContentProps) {
  const { language, t } = useLanguage();
  const { items, updateItemQuantity, removeItem, clearCart } = useCart();
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const lines = items.map((item) => ({
    cartItem: item,
    product: productsById.get(item.productId) ?? null,
  }));
  const validLines = lines.filter((line) => line.product?.inStock);
  const subtotal = validLines.reduce(
    (total, line) => total + (line.product?.price ?? 0) * line.cartItem.quantity,
    0,
  );

  return (
    <main className="min-h-screen bg-[#0f0b07] px-6 pb-24 pt-32 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
            {t.storefront.cart.label}
          </p>
          <h1 className="font-serif text-5xl font-semibold text-[#f7ead2]">
            {t.storefront.cart.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#e8dcc8]/70">
            {t.storefront.cart.description}
          </p>
        </div>

        {items.length === 0 ? (
          <section className="border border-[#f7ead2]/10 bg-[#120d08] px-8 py-14 text-center">
            <h2 className="font-serif text-3xl text-[#f7ead2]">
              {t.storefront.cart.emptyTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#e8dcc8]/68">
              {t.storefront.cart.emptyDescription}
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07]"
            >
              {t.storefront.cart.continueShopping}
            </Link>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
            <section className="space-y-4">
              {lines.map(({ cartItem, product }) => {
                const unavailable = !product || !product.inStock;
                const productName = product?.name[language] ?? t.storefront.cart.unavailableProduct;
                const maxQuantity = product?.stock ?? 0;

                return (
                  <article
                    key={cartItem.productId}
                    className="grid gap-5 border border-[#f7ead2]/10 bg-[#120d08] p-5 sm:grid-cols-[7rem_1fr] lg:grid-cols-[8rem_1fr]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#080503]">
                      {product?.image ? (
                        product.image.startsWith("http") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt={productName}
                            className="h-full w-full object-contain p-3"
                          />
                        ) : (
                          <Image
                            src={product.image}
                            alt={productName}
                            fill
                            sizes="8rem"
                            className="object-contain p-3"
                          />
                        )
                      ) : null}
                    </div>
                    <div className="grid gap-5 md:grid-cols-[1fr_auto]">
                      <div>
                        <h2 className="font-serif text-2xl text-[#f7ead2]">
                          {productName}
                        </h2>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#e8dcc8]/54">
                          {t.storefront.cart.sku}: {product?.sku ?? "N/A"}
                        </p>
                        <p className="mt-4 text-sm text-[#e8dcc8]/68">
                          {unavailable
                            ? t.storefront.cart.unavailableMessage
                            : `${t.storefront.cart.available}: ${maxQuantity}`}
                        </p>
                      </div>
                      <div className="min-w-52 text-left md:text-right">
                        <p className="text-lg font-semibold text-[#f7ead2]">
                          {formatPrice(product?.price ?? 0)}
                        </p>
                        <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                          {t.storefront.cart.quantity}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, maxQuantity)}
                          value={cartItem.quantity}
                          disabled={unavailable}
                          onChange={(event) =>
                            updateItemQuantity(
                              cartItem.productId,
                              Number(event.target.value),
                            )
                          }
                          className="mt-2 h-11 w-24 border border-[#f7ead2]/14 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]"
                        />
                        <p className="mt-4 text-sm font-semibold text-[#e8dcc8]/78">
                          {t.storefront.cart.lineTotal}:{" "}
                          {formatPrice((product?.price ?? 0) * cartItem.quantity)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(cartItem.productId)}
                          className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344] hover:text-[#f7ead2]"
                        >
                          {t.storefront.cart.remove}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit border border-[#f7ead2]/10 bg-[#120d08] p-6">
              <h2 className="font-serif text-3xl text-[#f7ead2]">
                {t.storefront.cart.summary}
              </h2>
              <div className="mt-6 space-y-4 text-sm text-[#e8dcc8]/72">
                <div className="flex justify-between gap-4">
                  <span>{t.storefront.cart.subtotal}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{t.storefront.cart.tax}</span>
                  <span>{t.storefront.cart.pending}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{t.storefront.cart.shipping}</span>
                  <span>{t.storefront.cart.pending}</span>
                </div>
                <div className="border-t border-[#f7ead2]/10 pt-4 text-xs leading-5 text-[#e8dcc8]/56">
                  {t.storefront.cart.pendingTotals}
                </div>
              </div>
              <Link
                href="/checkout"
                aria-disabled={validLines.length === 0}
                className={`mt-7 inline-flex min-h-12 w-full items-center justify-center px-5 text-[0.72rem] font-bold uppercase tracking-[0.2em] ${
                  validLines.length === 0
                    ? "pointer-events-none bg-[#d8a344]/30 text-[#0f0b07]/55"
                    : "bg-[#d8a344] text-[#0f0b07] hover:bg-[#f0c062]"
                }`}
              >
                {t.storefront.cart.checkout}
              </Link>
              <button
                type="button"
                onClick={clearCart}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center border border-[#f7ead2]/14 px-5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/72 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
              >
                {t.storefront.cart.clear}
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
