import type { Translation } from "@/lib/translations";

const en: Translation = {
  brand: {
    name: "ASHE TOKUN",
    homeLabel: "ASHE TOKUN home",
  },
  nav: {
    links: ["Home", "Shop", "About", "Contact"],
    cta: "Visit Store",
  },
  hero: {
    label: "ASHE TOKUN",
    headline: "Tradition, faith, and spiritual power in every detail.",
    subtitle:
      "Premium religious articles, ceremonial tools, spiritual supplies, handcrafted pieces, and authentic traditions.",
    primaryButton: "Explore Collection",
    secondaryButton: "Visit Our Store",
    logoAlt: "ASHE TOKUN logo",
  },
  footer: {
    copyright: (year: number) =>
      `© ${year} ASHE TOKUN. All rights reserved.`,
  },
  languageToggle: {
    label: "Language selector",
  },
};

export default en;
