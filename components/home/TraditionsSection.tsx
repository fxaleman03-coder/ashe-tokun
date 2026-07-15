"use client";

import { useTranslations } from "@/components/LanguageProvider";
import TraditionCard from "@/components/home/TraditionCard";

const traditionCardHrefs = [
  "/shop/category/opele",
  "/shop/category/elekes",
  "/shop/category/iruke",
  "/shop/category/ide",
] as const;

export default function TraditionsSection() {
  const t = useTranslations();

  return (
    <section
      id="traditions"
      className="bg-[#0f0b07] px-6 py-24 sm:px-8 sm:py-28 lg:px-10 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-14 max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
            {t.traditions.label}
          </p>
          <h2 className="font-serif text-4xl font-semibold leading-tight text-[#f7ead2] sm:text-5xl">
            {t.traditions.heading}
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#e8dcc8]/70">
            {t.traditions.subtitle}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {t.traditions.cards.map((card, index) => (
            <TraditionCard
              key={card.title}
              title={card.title}
              description={card.description}
              imageSrc={card.imageSrc}
              imageAlt={card.imageAlt}
              buttonLabel={t.traditions.cardButton}
              href={traditionCardHrefs[index] ?? "/shop"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
