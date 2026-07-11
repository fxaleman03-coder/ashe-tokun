"use client";

import { useLanguage } from "@/components/LanguageProvider";
import CategoryCard from "@/components/shop/CategoryCard";
import type { StorefrontCategory } from "@/lib/data/storefrontCategories";

type StorefrontCategorySectionProps = {
  categories: StorefrontCategory[];
  variant: "home" | "shop";
  compact?: boolean;
};

export default function StorefrontCategorySection({
  categories,
  variant,
  compact = false,
}: StorefrontCategorySectionProps) {
  const { t } = useLanguage();
  const sectionText = t.storefront.categorySection;
  const label =
    variant === "home" ? sectionText.homeLabel : sectionText.shopLabel;
  const heading =
    variant === "home" ? sectionText.homeHeading : sectionText.shopHeading;
  const subtitle =
    variant === "home" ? sectionText.homeSubtitle : sectionText.shopSubtitle;

  return (
    <section
      className={`bg-[#0f0b07] px-6 sm:px-8 lg:px-10 ${
        compact ? "py-20 sm:py-24" : "py-24 sm:py-28 lg:py-32"
      }`}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-14 max-w-3xl lg:mb-16">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
            {label}
          </p>
          <h2 className="font-serif text-4xl font-semibold leading-tight text-[#f7ead2] sm:text-5xl">
            {heading}
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#e8dcc8]/70">
            {subtitle}
          </p>
        </div>

        {categories.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.slug} category={category} />
            ))}
          </div>
        ) : (
          <div className="border border-[#f7ead2]/10 bg-[#120d08] px-8 py-14 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
            <p className="text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
              {sectionText.noCategoriesTitle}
            </p>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#e8dcc8]/70">
              {sectionText.noCategoriesAvailable}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
