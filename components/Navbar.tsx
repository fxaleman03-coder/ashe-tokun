"use client";

import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import { languageOptions } from "@/lib/translations";

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#f7ead2]/10 bg-[#0f0b07]/82 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-[5.25rem] w-full max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10"
      >
        <a
          href="#"
          className="group flex items-center gap-3 text-[#f7ead2]"
          aria-label={t.brand.homeLabel}
        >
          <Image
            src="/brand/ashe-tokun-logo.png"
            alt=""
            width={52}
            height={52}
            priority
            className="h-10 w-10 object-contain opacity-95 drop-shadow-[0_8px_18px_rgba(216,163,68,0.16)] transition duration-500 ease-out group-hover:opacity-100 group-hover:drop-shadow-[0_10px_24px_rgba(216,163,68,0.28)] sm:h-11 sm:w-11"
          />
          <span className="hidden font-serif text-[1.02rem] font-semibold tracking-[0.26em] transition-colors duration-500 ease-out group-hover:text-[#d8a344] sm:inline">
            {t.brand.name}
          </span>
        </a>

        <div className="hidden items-center gap-10 md:flex">
          {t.nav.links.map((link, index) => (
            <a
              key={link}
              href="#"
              aria-current={index === 0 ? "page" : undefined}
              className="group relative py-3 text-[0.82rem] font-medium uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition duration-500 ease-out hover:text-[#f7ead2] aria-[current=page]:text-[#d8a344]"
            >
              {link}
              <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-transparent via-[#d8a344] to-transparent opacity-0 transition duration-500 ease-out group-hover:scale-x-100 group-hover:opacity-80 group-aria-[current=page]:scale-x-100 group-aria-[current=page]:opacity-70" />
              <span className="absolute inset-x-1 -bottom-1 h-px scale-x-0 bg-[#d8a344]/25 blur-sm transition duration-500 ease-out group-hover:scale-x-100 group-aria-[current=page]:scale-x-100" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#"
            className="group relative hidden min-h-11 items-center justify-center overflow-hidden border border-[#d8a344]/55 px-5 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#d8a344] shadow-[0_0_0_rgba(216,163,68,0)] transition duration-500 ease-out hover:border-[#d8a344] hover:bg-[#d8a344] hover:text-[#0f0b07] hover:shadow-[0_0_34px_rgba(216,163,68,0.22)] sm:inline-flex"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#f7ead2]/30 to-transparent transition duration-700 ease-out group-hover:translate-x-full" />
            <span className="relative">{t.nav.cta}</span>
          </a>

          <div
            className="inline-flex border border-[#f7ead2]/15 bg-[#0f0b07]/60 p-1"
            aria-label={t.languageToggle.label}
          >
            {languageOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => setLanguage(option.code)}
                aria-pressed={language === option.code}
                className="min-h-8 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#e8dcc8]/58 transition duration-500 ease-out hover:text-[#f7ead2] aria-pressed:bg-[#d8a344] aria-pressed:text-[#0f0b07]"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
