"use client";

import Image from "next/image";
import { useTranslations } from "@/components/LanguageProvider";

export default function Hero() {
  const t = useTranslations();

  return (
    <section className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#0f0b07] px-6 pb-20 pt-32 sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_22%_18%,rgba(216,163,68,0.18),transparent_30%),radial-gradient(circle_at_78%_26%,rgba(247,234,210,0.08),transparent_24%),linear-gradient(135deg,#0f0b07_0%,#171008_52%,#090604_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#0f0b07] to-transparent" />
      <div className="absolute left-1/2 top-24 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full border border-[#d8a344]/10" />
      <div className="absolute right-0 top-1/2 -z-10 h-px w-1/2 bg-gradient-to-l from-[#d8a344]/40 to-transparent" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-3xl">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.42em] text-[#d8a344]">
            {t.hero.label}
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-[1.02] text-[#f7ead2] sm:text-6xl lg:text-7xl">
            {t.hero.headline}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#e8dcc8]/76 sm:text-xl sm:leading-9">
            {t.hero.subtitle}
          </p>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:gap-5">
            <a
              href="#"
              className="inline-flex min-h-16 items-center justify-center bg-[#d8a344] px-8 text-[0.82rem] font-bold uppercase tracking-[0.22em] text-[#0f0b07] shadow-[0_18px_42px_rgba(216,163,68,0.16)] transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-[#f0c062] hover:shadow-[0_22px_60px_rgba(216,163,68,0.28)]"
            >
              {t.hero.primaryButton}
            </a>
            <a
              href="#"
              className="inline-flex min-h-16 items-center justify-center border border-[#f7ead2]/20 px-8 text-[0.82rem] font-bold uppercase tracking-[0.22em] text-[#f7ead2] shadow-[0_0_0_rgba(216,163,68,0)] transition duration-500 ease-out hover:-translate-y-0.5 hover:border-[#d8a344]/85 hover:text-[#d8a344] hover:shadow-[0_0_36px_rgba(216,163,68,0.14)]"
            >
              {t.hero.secondaryButton}
            </a>
          </div>
        </div>

        <div className="relative min-h-[24rem] sm:min-h-[30rem] lg:min-h-[34rem]">
          <div className="absolute left-1/2 top-1/2 h-[min(82vw,34rem)] w-[min(82vw,34rem)] -translate-x-1/2 -translate-y-1/2 border border-[#d8a344]/20 bg-[#120d08]/70 shadow-2xl shadow-black/40" />
          <div className="absolute left-1/2 top-1/2 h-[min(68vw,28rem)] w-[min(68vw,28rem)] -translate-x-1/2 -translate-y-1/2 border border-[#f7ead2]/10 bg-[radial-gradient(circle,rgba(216,163,68,0.18),rgba(15,11,7,0.32)_55%,rgba(15,11,7,0.72))]" />
          <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d8a344]/45 to-transparent" />
          <div className="absolute left-1/2 top-1/2 h-full w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-[#d8a344]/45 to-transparent" />

          <div className="absolute left-1/2 top-1/2 flex h-[min(56vw,22rem)] w-[min(56vw,22rem)] -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-[#d8a344]/45 bg-[#0f0b07]/85 p-10 shadow-[0_0_80px_rgba(216,163,68,0.18)] sm:p-12">
            <Image
              src="/brand/ashe-tokun-logo.png"
              alt={t.hero.logoAlt}
              width={520}
              height={520}
              priority
              className="h-full w-full object-contain drop-shadow-[0_18px_42px_rgba(0,0,0,0.55)]"
            />
          </div>

          <div className="absolute bottom-8 left-1/2 h-12 w-64 -translate-x-1/2 border-b border-[#d8a344]/35" />
        </div>
      </div>
    </section>
  );
}
