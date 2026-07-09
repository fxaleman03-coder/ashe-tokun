"use client";

import { useLanguage } from "@/components/LanguageProvider";
import ProductCard from "@/components/shop/ProductCard";
import { featuredProducts } from "@/lib/products";

export default function FeaturedProductsPreview() {
  const { language, t } = useLanguage();

  return (
    <section className="bg-[#0f0b07] px-6 py-24 sm:px-8 sm:py-28 lg:px-10 lg:py-32">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-16 max-w-3xl lg:mb-[4.5rem]">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
            {t.featuredProducts.label}
          </p>
          <h2 className="font-serif text-4xl font-semibold leading-tight text-[#f7ead2] sm:text-5xl">
            {t.featuredProducts.heading}
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#e8dcc8]/70">
            {t.featuredProducts.subtitle}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              language={language}
              labels={t.featuredProducts.labels}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
