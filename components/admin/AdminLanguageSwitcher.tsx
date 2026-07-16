"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { languageOptions } from "@/lib/translations";

export default function AdminLanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
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
          className="min-h-9 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#e8dcc8]/58 transition duration-500 ease-out hover:text-[#f7ead2] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/60 aria-pressed:bg-[#d8a344] aria-pressed:text-[#0f0b07]"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
