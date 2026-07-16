"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export type AdminQuickActionKey =
  | "addProduct"
  | "receiveInventory"
  | "openPOS";

type AdminQuickAction = {
  key: AdminQuickActionKey;
  href: string;
};

type AdminQuickActionsProps = {
  actions: AdminQuickAction[];
};

export default function AdminQuickActions({ actions }: AdminQuickActionsProps) {
  const { t } = useLanguage();
  const labels = t.staff.global;

  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 border border-[#f7ead2]/10 bg-[#120d08] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d8a344]">
        {labels.quickActions}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/14 bg-[#0f0b07] px-4 text-xs font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/72 transition duration-300 hover:border-[#d8a344]/55 hover:text-[#d8a344] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
          >
            {labels[action.key]}
          </Link>
        ))}
      </div>
    </section>
  );
}
