import type { ReactNode } from "react";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
