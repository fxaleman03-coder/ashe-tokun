import type { ReactNode } from "react";
import AdminPwaRegistrar from "@/components/admin/AdminPwaRegistrar";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AdminPwaRegistrar />
      {children}
    </LanguageProvider>
  );
}
