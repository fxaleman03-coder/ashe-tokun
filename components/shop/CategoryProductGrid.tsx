"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import ProductCard from "@/components/shop/ProductCard";
import {
  mergeProductCatalog,
  useProductOverrides,
} from "@/lib/productStore";
import type { Product } from "@/lib/products";

type CategoryProductGridProps = {
  products: Product[];
};

export default function CategoryProductGrid({
  products,
}: CategoryProductGridProps) {
  const { language, t } = useLanguage();
  const overrides = useProductOverrides();
  const displayProducts = useMemo(
    () => mergeProductCatalog(products, overrides),
    [products, overrides],
  );

  if (displayProducts.length === 0) {
    return (
      <div className="border border-[#f7ead2]/10 bg-[#120d08] px-8 py-14 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <p className="text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
          {t.storefront.categoryPage.noProductsTitle}
        </p>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#e8dcc8]/70">
          {t.storefront.categoryPage.noProductsAvailable}
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07] hover:shadow-[0_0_34px_rgba(216,163,68,0.2)]"
        >
          {t.storefront.categoryPage.backToShop}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {displayProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          language={language}
          labels={t.featuredProducts.labels}
          showAddToCart={false}
        />
      ))}
    </div>
  );
}
