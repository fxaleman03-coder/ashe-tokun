import type { ReactNode } from "react";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
