"use client";

import { useTranslations } from "@/components/LanguageProvider";

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-white/10 bg-[#0f0b07] px-6 py-8 text-center sm:px-8 lg:px-10">
      <p className="text-sm text-[#e8dcc8]/60">
        {t.footer.copyright(new Date().getFullYear())}
      </p>
    </footer>
  );
}
