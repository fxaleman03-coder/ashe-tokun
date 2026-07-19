"use client";

import { LanguageProvider } from "@/components/LanguageProvider";
import { CartProvider } from "@/components/storefront/CartProvider";

export default function StorefrontProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <CartProvider>{children}</CartProvider>
    </LanguageProvider>
  );
}
