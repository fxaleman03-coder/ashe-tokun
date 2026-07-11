"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import CategoryProductGrid from "@/components/shop/CategoryProductGrid";
import type { StorefrontCategory } from "@/lib/data/storefrontCategories";
import type { Product } from "@/lib/products";

type CategoryPageContentProps = {
  category: StorefrontCategory;
  products: Product[];
};

export default function CategoryPageContent({
  category,
  products,
}: CategoryPageContentProps) {
  const { t } = useLanguage();
  const categoryTranslation = t.storefront.categoryLabels[category.slug];
  const categoryName = categoryTranslation?.name ?? category.name;
  const categoryDescription =
    categoryTranslation?.description ||
    category.description ||
    t.storefront.categorySection.genericCategoryDescription;
  const productCountLabel =
    products.length === 1
      ? t.storefront.categorySection.productSingular
      : t.storefront.categorySection.productPlural;

  return (
    <main className="min-h-screen bg-[#0f0b07] px-6 pb-24 pt-32 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <nav
          aria-label={t.storefront.categoryPage.breadcrumbLabel}
          className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#e8dcc8]/50"
        >
          <Link href="/" className="transition-colors hover:text-[#d8a344]">
            {t.storefront.categoryPage.breadcrumbHome}
          </Link>
          <span className="text-[#d8a344]/60">/</span>
          <Link href="/shop" className="transition-colors hover:text-[#d8a344]">
            {t.storefront.categoryPage.breadcrumbShop}
          </Link>
          <span className="text-[#d8a344]/60">/</span>
          <span className="text-[#e8dcc8]/70">{categoryName}</span>
        </nav>

        <section className="mb-14 mt-12 max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
            {t.storefront.categoryPage.label}
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-tight text-[#f7ead2] sm:text-6xl">
            {categoryName}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#e8dcc8]/70">
            {categoryDescription}
          </p>
          <p className="mt-6 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {products.length} {productCountLabel}
          </p>
        </section>

        <CategoryProductGrid products={products} />
      </div>
    </main>
  );
}
