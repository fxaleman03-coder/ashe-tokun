import type { Translation } from "@/lib/translations";

// Draft Yoruba placeholders only.
// These are plain-language placeholders for review by a knowledgeable speaker/practitioner.
// They intentionally avoid sacred or liturgical Yoruba phrasing.
const yo: Translation = {
  brand: {
    name: "ASHE TOKUN",
    homeLabel: "ASHE TOKUN ile",
  },
  nav: {
    links: ["Ilé", "Ọjà", "Nípa wa", "Kan sí wa"],
    cta: "Wá sí Ọjà",
  },
  hero: {
    label: "ASHE TOKUN",
    headline: "Àṣà, ìgbàgbọ́, àti agbára ẹ̀mí nínú gbogbo ohun.",
    subtitle:
      "Àwọn ohun èlò ẹ̀sìn, ohun èlò ayẹyẹ, àti àwọn nkan fún ìbáṣepọ̀ pẹ̀lú àṣà àti ẹ̀mí.",
    primaryButton: "Wo Àkójọpọ̀",
    secondaryButton: "Wá sí Ọjà Wa",
    logoAlt: "Àmì ASHE TOKUN",
  },
  footer: {
    copyright: (year) => `© ${year} ASHE TOKUN. All rights reserved.`,
  },
  languageToggle: {
    label: "Language selector",
  },
};

export default yo;
