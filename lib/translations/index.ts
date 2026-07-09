import en from "@/lib/translations/en";
import es from "@/lib/translations/es";
import yo from "@/lib/translations/yo";

export type Translation = {
  brand: {
    name: string;
    homeLabel: string;
  };
  nav: {
    links: readonly [string, string, string, string];
    cta: string;
  };
  hero: {
    label: string;
    headline: string;
    subtitle: string;
    primaryButton: string;
    secondaryButton: string;
    logoAlt: string;
  };
  traditions: {
    label: string;
    heading: string;
    subtitle: string;
    cardButton: string;
    cards: readonly {
      title: string;
      description: string;
      imageSrc: string;
      imageAlt: string;
    }[];
  };
  featuredProducts: {
    label: string;
    heading: string;
    subtitle: string;
    labels: {
      viewProduct: string;
      addToCart: string;
      inStock: string;
      soldOut: string;
      new: string;
      featured: string;
    };
  };
  footer: {
    copyright: (year: number) => string;
  };
  languageToggle: {
    label: string;
  };
};

export const translations = {
  en,
  es,
  yo,
} as const;

export const languageOptions = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "yo", label: "YORÙBÁ" },
] as const;

export type Language = keyof typeof translations;
