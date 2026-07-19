"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCart } from "@/components/storefront/CartProvider";
import type { Product } from "@/lib/products";
import {
  mergeProductOverride,
  useProductOverride,
} from "@/lib/productStore";

type ProductDetailPageProps = {
  product: Product | null;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function ProductDetailPage({ product }: ProductDetailPageProps) {
  const { language, t } = useLanguage();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const productOverride = useProductOverride(product?.slug ?? "");
  const displayProduct = product
    ? mergeProductOverride(product, productOverride)
    : null;
  const productName = displayProduct?.name[language] ?? "";
  const detailImages = useMemo(() => {
    if (!displayProduct) {
      return [];
    }

    if (displayProduct.galleryImages?.length) {
      return displayProduct.galleryImages.map((image) => ({
        id: image.id,
        url: image.public_url,
        alt: image.alt_text ?? productName,
      }));
    }

    if (displayProduct.image) {
      return [
        {
          id: "primary-image",
          url: displayProduct.image,
          alt: productName,
        },
      ];
    }

    return [];
  }, [displayProduct, productName]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const activeImage =
    detailImages.find((image) => image.url === selectedImageUrl) ??
    detailImages[0] ??
    null;

  if (!displayProduct) {
    return (
      <main className="min-h-screen bg-[#0f0b07] px-6 pb-24 pt-36 sm:px-8 lg:px-10">
        <section className="mx-auto max-w-3xl border border-[#f7ead2]/10 bg-[#120d08] px-8 py-14 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <p className="text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
            ASHE TOKUN
          </p>
          <h1 className="mt-5 font-serif text-4xl font-semibold text-[#f7ead2]">
            {t.productPage.productNotFound}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#e8dcc8]/70">
            {t.productPage.productNotFoundDescription}
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07] hover:shadow-[0_0_34px_rgba(216,163,68,0.2)]"
          >
            {t.productPage.backToShop}
          </Link>
        </section>
      </main>
    );
  }

  const stockLabel = displayProduct.inStock
    ? t.featuredProducts.labels.inStock
    : t.featuredProducts.labels.soldOut;

  function handleAddToCart() {
    addItem(displayProduct!.id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <main className="bg-[#0f0b07] px-6 pb-24 pt-32 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#e8dcc8]/50"
        >
          <Link href="/" className="transition-colors hover:text-[#d8a344]">
            {t.productPage.breadcrumbHome}
          </Link>
          <span className="text-[#d8a344]/60">/</span>
          <Link href="/shop" className="transition-colors hover:text-[#d8a344]">
            {t.productPage.breadcrumbShop}
          </Link>
          <span className="text-[#d8a344]/60">/</span>
          <span className="text-[#e8dcc8]/70">{productName}</span>
        </nav>

        <section className="mt-12 grid gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
          <div className="relative overflow-hidden border border-[#f7ead2]/10 bg-[#080503] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.34),0_0_56px_rgba(216,163,68,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(216,163,68,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(247,234,210,0.06),transparent_34%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
            <div className="absolute inset-6 border border-[#f7ead2]/8 bg-[#090604]/80 shadow-[inset_0_0_78px_rgba(216,163,68,0.07),inset_0_-44px_64px_rgba(0,0,0,0.54)]" />
            <div className="absolute inset-x-14 bottom-14 h-28 bg-[#d8a344]/10 blur-3xl" />
            <div className="relative aspect-square sm:aspect-[5/4] lg:aspect-square">
              {activeImage ? (
                activeImage.url.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage.url}
                    alt={activeImage.alt}
                    className="absolute inset-0 h-full w-full object-contain p-7 drop-shadow-[0_34px_44px_rgba(0,0,0,0.64)] sm:p-10"
                  />
                ) : (
                  <Image
                    src={activeImage.url}
                    alt={activeImage.alt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-contain p-7 drop-shadow-[0_34px_44px_rgba(0,0,0,0.64)] sm:p-10"
                  />
                )
              ) : (
                <div className="absolute inset-8 flex items-center justify-center border border-[#f7ead2]/10 text-center text-xs font-bold uppercase tracking-[0.22em] text-[#e8dcc8]/38">
                  Image Pending
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0f0b07]/75 via-[#0f0b07]/18 to-transparent" />
            {detailImages.length > 1 ? (
              <div className="relative mt-6 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {detailImages.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImageUrl(image.url)}
                    className={`relative aspect-square overflow-hidden border bg-[#080503] transition duration-500 ${
                      activeImage?.url === image.url
                        ? "border-[#d8a344]/70 shadow-[0_0_28px_rgba(216,163,68,0.15)]"
                        : "border-[#f7ead2]/10 hover:border-[#d8a344]/45"
                    }`}
                    aria-label={`View ${image.alt}`}
                  >
                    {image.url.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.url}
                        alt={image.alt}
                        className="absolute inset-0 h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        sizes="8rem"
                        className="object-contain p-2"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border border-[#f7ead2]/10 bg-[#120d08]/86 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.26)] sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d8a344]">
              {displayProduct.category[language]}
            </p>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight text-[#f7ead2] sm:text-5xl">
              {productName}
            </h1>
            <p className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#e8dcc8]/58">
              Brand / Vendor
              <span className="ml-3 text-[#d8a344]">
                {displayProduct.vendor}
              </span>
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <p className="text-2xl font-semibold text-[#f7ead2]">
                {formatPrice(displayProduct.price)}
              </p>
              {displayProduct.compareAtPrice ? (
                <p className="text-base text-[#e8dcc8]/42 line-through">
                  {formatPrice(displayProduct.compareAtPrice)}
                </p>
              ) : null}
              <p className="border border-[#d8a344]/35 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                {stockLabel}
              </p>
            </div>

            <p className="mt-7 text-lg leading-8 text-[#e8dcc8]/72">
              {displayProduct.shortDescription[language]}
            </p>

            <button
              type="button"
              onClick={handleAddToCart}
              className="mt-9 inline-flex min-h-14 w-full items-center justify-center bg-[#d8a344] px-7 text-[0.78rem] font-bold uppercase tracking-[0.22em] text-[#0f0b07] shadow-[0_18px_42px_rgba(216,163,68,0.16)] transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-[#f0c062] hover:shadow-[0_22px_60px_rgba(216,163,68,0.28)] disabled:cursor-not-allowed disabled:bg-[#d8a344]/35 disabled:text-[#0f0b07]/60 disabled:shadow-none"
              disabled={!displayProduct.inStock}
            >
              {added ? t.productPage.addedToCart : t.productPage.addToCart}
            </button>

            <Link
              href="/shop"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center border border-[#f7ead2]/18 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/80 hover:text-[#d8a344] hover:shadow-[0_0_30px_rgba(216,163,68,0.12)]"
            >
              {t.productPage.backToShop}
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-4">
          {[
            [t.productPage.details, t.productPage.detailsPlaceholder],
            [t.productPage.materials, t.productPage.materialsPlaceholder],
            [
              t.productPage.spiritualNote,
              t.productPage.spiritualNotePlaceholder,
            ],
            [t.productPage.shipping, t.productPage.shippingPlaceholder],
          ].map(([title, body]) => (
            <article
              key={title}
              className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.2)]"
            >
              <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
                {title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#e8dcc8]/68">
                {body}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
