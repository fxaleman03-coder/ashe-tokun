"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { StorefrontCategory } from "@/lib/data/storefrontCategories";

type CategoryCardProps = {
  category: StorefrontCategory;
};

export default function CategoryCard({ category }: CategoryCardProps) {
  const { t } = useLanguage();
  const categoryTranslation = t.storefront.categoryLabels[category.slug];
  const categoryName = categoryTranslation?.name ?? category.name;
  const categoryDescription =
    categoryTranslation?.description ||
    category.description ||
    t.storefront.categorySection.genericCategoryDescription;
  const productCountLabel =
    category.productCount === 1
      ? t.storefront.categorySection.productSingular
      : t.storefront.categorySection.productPlural;

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-700 ease-out hover:-translate-y-1 hover:border-[#d8a344]/55 hover:shadow-[0_30px_90px_rgba(0,0,0,0.34),0_0_42px_rgba(216,163,68,0.12)]">
      <Link
        href={`/shop/category/${category.slug}`}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#080503] p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(216,163,68,0.22),transparent_32%),radial-gradient(circle_at_20%_85%,rgba(247,234,210,0.07),transparent_28%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
          <div className="absolute inset-4 border border-[#f7ead2]/8 bg-[#090604]/80 shadow-[inset_0_0_64px_rgba(216,163,68,0.07),inset_0_-34px_54px_rgba(0,0,0,0.54)]" />
          <div className="absolute inset-x-8 bottom-8 h-20 bg-[#d8a344]/10 blur-3xl transition duration-1000 ease-out group-hover:bg-[#d8a344]/16" />

          <div className="relative flex h-full w-full items-center justify-center">
            {category.representativeImage ? (
              <Image
                src={category.representativeImage}
                alt={`${categoryName} ${t.storefront.categorySection.category}`}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                className="object-contain p-6 drop-shadow-[0_26px_34px_rgba(0,0,0,0.62)] transition duration-1000 ease-out group-hover:scale-[1.025]"
              />
            ) : (
              <div className="absolute inset-6 flex items-center justify-center border border-[#f7ead2]/8 text-center font-serif text-5xl text-[#d8a344]/72">
                {categoryName.slice(0, 1)}
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0f0b07]/72 via-[#0f0b07]/18 to-transparent" />
        </div>

        <div className="flex flex-1 flex-col px-6 pb-8 pt-7">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {category.productCount} {productCountLabel}
          </p>
          <h3 className="mt-5 font-serif text-3xl font-semibold leading-tight text-[#f7ead2]">
            {categoryName}
          </h3>
          <p className="mt-4 min-h-[4.5rem] text-sm leading-6 text-[#e8dcc8]/68">
            {categoryDescription}
          </p>
          <span className="mt-auto inline-flex min-h-12 items-center justify-center border border-[#f7ead2]/18 px-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 ease-out group-hover:border-[#d8a344]/80 group-hover:text-[#d8a344] group-hover:shadow-[0_0_30px_rgba(216,163,68,0.12)]">
            {t.storefront.categorySection.viewCategory}
          </span>
        </div>
      </Link>
    </article>
  );
}
