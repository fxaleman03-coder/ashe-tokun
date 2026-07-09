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
  traditions: {
    // Draft Yoruba placeholders only. These category lines need later review.
    label: "Wo Àwọn Àṣà Wa",
    heading: "Àwọn ohun pàtàkì, tí a yan pẹ̀lú ìtọ́jú.",
    subtitle:
      "Wo àwọn ẹ̀ka fún ohun èlò ayẹyẹ, àṣà, àti ìṣe ẹ̀mí lójoojúmọ́.",
    cardButton: "Wo",
    cards: [
      {
        title: "Ifá",
        description:
          "Àwọn ohun èlò àti nkan fún ẹ̀kọ́, ìmọ̀, àti ìtọ́sọ́nà.",
        imageSrc: "/categories/ifa.svg",
        imageAlt: "Àwòrán ìpò fún ẹ̀ka Ifá",
      },
      {
        title: "Òrìṣà",
        description:
          "Àwọn nkan fún ìbòwọ̀, ìrántí, àti ìṣe àṣà pẹ̀lú ọ̀wọ̀.",
        imageSrc: "/categories/orisa.svg",
        imageAlt: "Àwòrán ìpò fún ẹ̀ka Òrìṣà",
      },
      {
        title: "Àwọn Ohun Èlò Ẹ̀mí",
        description:
          "Àwọn ohun èlò fún ìmúra, ìtọ́jú, àti ìṣe pẹ̀lú èrò rere.",
        imageSrc: "/categories/spiritual-supplies.svg",
        imageAlt: "Àwòrán ìpò fún àwọn ohun èlò ẹ̀mí",
      },
      {
        title: "Àwọn Nkan Ìbòwọ̀",
        description:
          "Àwọn nkan rírẹwà fún ìbòwọ̀, ìronú, àti ìṣe lójoojúmọ́.",
        imageSrc: "/categories/devotional-articles.svg",
        imageAlt: "Àwòrán ìpò fún àwọn nkan ìbòwọ̀",
      },
    ],
  },
  featuredProducts: {
    // Draft Yoruba placeholders only. Product UI labels need later review.
    label: "Àwọn Ọjà Àṣàyàn",
    heading: "Àwọn Ọjà Àṣàyàn",
    subtitle:
      "Àwọn ohun ẹ̀mí tí a yàn fún ìbáṣepọ̀, ayẹyẹ, àti ìṣe ojoojúmọ́.",
    labels: {
      viewProduct: "Wo Ọjà",
      addToCart: "Fi Kún",
      inStock: "Wà Ní Ọjà",
      soldOut: "Kò Sí",
      new: "Tuntun",
      featured: "Àṣàyàn",
    },
  },
  footer: {
    copyright: (year) => `© ${year} ASHE TOKUN. All rights reserved.`,
  },
  languageToggle: {
    label: "Language selector",
  },
};

export default yo;
