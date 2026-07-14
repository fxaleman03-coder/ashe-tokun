"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type NotificationCenterProps = {
  alertCount?: number;
};

export default function NotificationCenter({
  alertCount = 0,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const labels = t.staff.global;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={labels.notifications}
        className="relative flex h-11 w-11 items-center justify-center border border-[#f7ead2]/14 bg-[#120d08] text-[#e8dcc8]/72 transition duration-300 hover:border-[#d8a344]/55 hover:text-[#d8a344] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          !
        </span>
        {alertCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-[#d8a344] px-1 text-[0.62rem] font-bold text-[#0f0b07]">
            {alertCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-72 border border-[#d8a344]/24 bg-[#120d08] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {labels.notifications}
          </p>
          <p className="mt-4 border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/62">
            {labels.noNewNotifications}
          </p>
        </div>
      ) : null}
    </div>
  );
}
