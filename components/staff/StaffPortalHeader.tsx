"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { languageOptions } from "@/lib/translations";
import { logoutStaffAction } from "@/lib/staff/staffActions";
import { getSecurityRoleLabel } from "@/lib/staff/roleLabels";
import type { StaffSession } from "@/lib/staff/staffSession";

type StaffPortalHeaderProps = {
  session: StaffSession;
};

const dateLocales = {
  en: "en-US",
  es: "es-US",
  yo: "yo-NG",
} as const;

export default function StaffPortalHeader({ session }: StaffPortalHeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    function updateTime() {
      setCurrentTime(
        new Intl.DateTimeFormat(dateLocales[language], {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date()),
      );
    }

    updateTime();
    const interval = window.setInterval(updateTime, 60_000);

    return () => window.clearInterval(interval);
  }, [language]);

  return (
    <header className="border-b border-[#f7ead2]/10 bg-[#0f0b07]/88 px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/staff"
            className="text-xs font-bold uppercase tracking-[0.34em] text-[#d8a344] transition duration-300 hover:text-[#f7ead2] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/60 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
          >
            {t.staff.operations}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-serif text-2xl font-semibold text-[#f7ead2] sm:text-3xl">
              {t.staff.welcome}, {session.displayName}
            </h1>
            {currentTime ? (
              <span className="border border-[#f7ead2]/10 bg-[#120d08] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#e8dcc8]/62">
                {currentTime}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[#e8dcc8]/60">
            <span>
              {t.staff.role}:{" "}
              <strong className="font-semibold text-[#f7ead2]">
                {getSecurityRoleLabel(session.role)}
              </strong>
            </span>
            <span aria-hidden="true">/</span>
            <span>
              {t.staff.location}:{" "}
              <strong className="font-semibold text-[#f7ead2]">
                {session.location.name}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
          <form action={logoutStaffAction}>
            <button
              type="submit"
            className="min-h-11 border border-[#d8a344]/45 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-300 hover:bg-[#d8a344] hover:text-[#0f0b07] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
            >
              {t.staff.logout}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
