"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/storefront/CartProvider";
import type { Language, Translation } from "@/lib/translations";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
  language: Language;
  labels: Translation["featuredProducts"]["labels"];
  showAddToCart?: boolean;
};

function getMerchandisingBadges(
  product: Product,
  language: Language,
  labels: Translation["featuredProducts"]["labels"],
) {
  const badges = [];
  const category = product.category[language].toLowerCase();

  if (product.isNew) {
    badges.push(labels.newArrival);
  }

  if (category.includes("ajako")) {
    badges.push(labels.ajakoOriginals);
  } else if (category.includes("set") || category.includes("àkójọpọ̀")) {
    badges.push(labels.limitedEdition);
  } else if (category.includes("tool") || category.includes("herramienta")) {
    badges.push(labels.bestSeller);
  } else {
    badges.push(labels.handcrafted);
  }

  return badges.slice(0, 2);
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function ProductCard({
  product,
  language,
  labels,
  showAddToCart = true,
}: ProductCardProps) {
  const badges = getMerchandisingBadges(product, language, labels);
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    addItem(product.id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-700 ease-out hover:-translate-y-1 hover:border-[#d8a344]/55 hover:shadow-[0_30px_90px_rgba(0,0,0,0.34),0_0_42px_rgba(216,163,68,0.12)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#080503] p-5 xl:aspect-[4/4.35]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(216,163,68,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(247,234,210,0.06),transparent_34%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
        <div className="absolute inset-4 border border-[#f7ead2]/8 bg-[#090604]/80 shadow-[inset_0_0_64px_rgba(216,163,68,0.07),inset_0_-34px_54px_rgba(0,0,0,0.54)]" />
        <div className="absolute inset-x-8 bottom-8 h-20 bg-[#d8a344]/10 blur-3xl transition duration-1000 ease-out group-hover:bg-[#d8a344]/16" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_44%,rgba(0,0,0,0.48)_100%)]" />

        <div className="relative flex h-full w-full items-center justify-center">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name[language]}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
              className="object-contain p-5 drop-shadow-[0_26px_34px_rgba(0,0,0,0.62)] transition duration-1000 ease-out group-hover:scale-[1.025] sm:p-6"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(216,163,68,0.34),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(247,234,210,0.08),transparent_28%),linear-gradient(135deg,#181008_0%,#0f0b07_58%,#060403_100%)] transition duration-1000 ease-out group-hover:scale-105" />
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0f0b07]/72 via-[#0f0b07]/18 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="border border-[#f7ead2]/18 bg-[#0f0b07]/72 px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2]/78 backdrop-blur"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-9 pt-7">
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

        <h3 className="mt-5 font-serif text-2xl font-semibold leading-tight text-[#f7ead2]">
          {product.name[language]}
        </h3>
        <p className="mt-4 min-h-[5.25rem] text-sm leading-6 text-[#e8dcc8]/68">
          {product.shortDescription[language]}
        </p>

        <div className="mt-auto flex items-end gap-3 pt-6">
          <p className="text-xl font-semibold text-[#f7ead2]">
            {formatPrice(product.price)}
          </p>
          {product.compareAtPrice ? (
            <p className="text-sm text-[#e8dcc8]/42 line-through">
              {formatPrice(product.compareAtPrice)}
            </p>
          ) : null}
        </div>

        <div
          className={`mt-7 grid gap-3 ${
            showAddToCart ? "sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          <Link
            href={`/shop/${product.slug}`}
            className="inline-flex min-h-12 items-center justify-center border border-[#f7ead2]/18 px-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/80 hover:text-[#d8a344] hover:shadow-[0_0_30px_rgba(216,163,68,0.12)]"
          >
            {labels.viewProduct}
          </Link>
          {showAddToCart ? (
            <button
              type="button"
              onClick={handleAddToCart}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] shadow-[0_16px_34px_rgba(216,163,68,0.16)] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.26)] disabled:cursor-not-allowed disabled:bg-[#d8a344]/35 disabled:text-[#0f0b07]/60 disabled:shadow-none"
              disabled={!product.inStock}
            >
              {added ? labels.addedToCart : labels.addToCart}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
