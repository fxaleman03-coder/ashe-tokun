"use client";

import Image from "next/image";
import type { Language, Translation } from "@/lib/translations";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
  language: Language;
  labels: Translation["featuredProducts"]["labels"];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ProductCard({
  product,
  language,
  labels,
}: ProductCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-700 ease-out hover:-translate-y-1 hover:border-[#d8a344]/55 hover:shadow-[0_30px_90px_rgba(0,0,0,0.34),0_0_42px_rgba(216,163,68,0.12)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#0f0b07] xl:aspect-[4/4.35]">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name[language]}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-1000 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(216,163,68,0.34),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(247,234,210,0.08),transparent_28%),linear-gradient(135deg,#181008_0%,#0f0b07_58%,#060403_100%)] transition duration-1000 ease-out group-hover:scale-105" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0b07]/86 via-[#0f0b07]/20 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.isNew ? (
            <span className="border border-[#d8a344]/45 bg-[#0f0b07]/72 px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] backdrop-blur">
              {labels.new}
            </span>
          ) : null}
          {product.isFeatured ? (
            <span className="border border-[#f7ead2]/18 bg-[#0f0b07]/72 px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2]/78 backdrop-blur">
              {labels.featured}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 pb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {product.category[language]}
          </p>
          <p
            className={`text-[0.68rem] font-bold uppercase tracking-[0.18em] ${
              product.inStock ? "text-[#e8dcc8]/60" : "text-[#d8a344]/70"
            }`}
          >
            {product.inStock ? labels.inStock : labels.soldOut}
          </p>
        </div>

        <h3 className="mt-4 font-serif text-2xl font-semibold text-[#f7ead2]">
          {product.name[language]}
        </h3>
        <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-[#e8dcc8]/68">
          {product.shortDescription[language]}
        </p>

        <div className="mt-auto flex items-end gap-3 pt-5">
          <p className="text-xl font-semibold text-[#f7ead2]">
            {formatPrice(product.price)}
          </p>
          {product.compareAtPrice ? (
            <p className="text-sm text-[#e8dcc8]/42 line-through">
              {formatPrice(product.compareAtPrice)}
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href="#"
            className="inline-flex min-h-12 items-center justify-center border border-[#f7ead2]/18 px-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/80 hover:text-[#d8a344] hover:shadow-[0_0_30px_rgba(216,163,68,0.12)]"
          >
            {labels.viewProduct}
          </a>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] shadow-[0_16px_34px_rgba(216,163,68,0.16)] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.26)] disabled:cursor-not-allowed disabled:bg-[#d8a344]/35 disabled:text-[#0f0b07]/60 disabled:shadow-none"
            disabled={!product.inStock}
          >
            {labels.addToCart}
          </button>
        </div>
      </div>
    </article>
  );
}
