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
      inStock: "Ṣetán fún Fífi Ránṣẹ́",
      soldOut: "Kò Sí Lọ́wọ́lọ́wọ́",
      new: "Tuntun",
      featured: "Àṣàyàn",
      newArrival: "Ọjà Tuntun",
      ajakoOriginals: "AJAKO Originals",
      handcrafted: "Iṣẹ́ Ọwọ́",
      limitedEdition: "Ẹ̀dà Díẹ̀",
      bestSeller: "Tí A Máa ń Rà Jù",
    },
  },
  productPage: {
    // Draft Yoruba placeholders only. Product page labels need later review.
    breadcrumbHome: "Ilé",
    breadcrumbShop: "Ọjà",
    details: "Àlàyé",
    materials: "Àwọn Ohun Èlò",
    spiritualNote: "Àkọsílẹ̀ Ẹ̀mí",
    shipping: "Fífi Ránṣẹ́",
    addToCart: "Fi Kún",
    backToShop: "Padà sí Ọjà",
    productNotFound: "A kò rí ọjà yìí",
    productNotFoundDescription:
      "Ọjà yìí kò sí nínú katalogi ASHE TOKUN lọ́wọ́lọ́wọ́.",
    detailsPlaceholder:
      "Ọjà ASHE TOKUN tí a yàn fún ayẹyẹ, ìbòwọ̀, tàbí ìṣe ẹ̀mí ojoojúmọ́.",
    materialsPlaceholder:
      "Àlàyé ohun èlò yóò jẹ́rìí nígbà tí katalogi osìsẹ́ bá parí.",
    spiritualNotePlaceholder:
      "Àlàyé àṣà àti ẹ̀mí yóò jẹ́ kí ẹni tó mọ̀ dájú kí ó tó jáde.",
    shippingPlaceholder:
      "Àṣàyàn fífi ránṣẹ́ àti àkókò rẹ̀ yóò wá ṣáájú checkout.",
  },
  storefront: {
    // Draft Yoruba placeholders only. Storefront category labels need later review.
    categorySection: {
      homeLabel: "Ra Nípasẹ̀ Ẹ̀ka",
      homeHeading: "Wo àwọn àkójọpọ̀ wa",
      homeSubtitle:
        "Wọlé sí ọjà nípasẹ̀ àwọn ẹ̀ka tí a ṣètò fún ohun ayẹyẹ, ìbòwọ̀, àti ìṣe ojoojúmọ́.",
      shopLabel: "Wo ASHE TOKUN",
      shopHeading: "Ọjà",
      shopSubtitle:
        "Wo àwọn ẹ̀ka fún ohun ẹ̀mí, ohun èlò ayẹyẹ, iṣẹ́ ọwọ́, àti àwọn nkan ìbòwọ̀.",
      viewCategory: "Wo Ẹ̀ka",
      productSingular: "Ọjà",
      productPlural: "Àwọn Ọjà",
      noCategoriesTitle: "Kò sí ẹ̀ka lọ́wọ́lọ́wọ́",
      noCategoriesAvailable:
        "A ń ṣètò àwọn ẹ̀ka fún ọjà ASHE TOKUN.",
      featuredCategory: "Ẹ̀ka Àṣàyàn",
      availableOnline: "Wà Lórí Ayélujára",
      category: "Ẹ̀ka",
      categories: "Àwọn Ẹ̀ka",
      genericCategoryDescription:
        "Wo ẹ̀ka ASHE TOKUN yìí bí àwọn ọjà tuntun ṣe ń wá.",
    },
    categoryPage: {
      breadcrumbLabel: "Ọ̀nà ojúewé",
      breadcrumbHome: "Ilé",
      breadcrumbShop: "Ọjà",
      label: "Ẹ̀ka",
      noProductsTitle: "Kò sí ọjà lọ́wọ́lọ́wọ́",
      noProductsAvailable: "Ẹ̀ka yìí kò ní ọjà tó wà lọ́wọ́lọ́wọ́.",
      backToShop: "Padà sí Ọjà",
    },
    categoryLabels: {
      keychains: {
        name: "Keychains",
        description:
          "Àwọn ohun ìrántí ojoojúmọ́ láti ASHE TOKUN àti àwọn brand rẹ̀.",
      },
      opele: {
        name: "Opele",
        description:
          "Àwọn nkan Opele àti àwọn ohun ayẹyẹ tó ní ìbáṣepọ̀ pẹ̀lú Ifá.",
      },
      opon: {
        name: "Opon",
        description:
          "Àwọn nkan Opon àti àwọn ohun ìfihàn fún ìṣe ayẹyẹ.",
      },
      ide: {
        name: "Ide",
        description:
          "Àwọn bracelet àti iṣẹ́ beadwork fún ìbòwọ̀, ayẹyẹ, àti lílò ojoojúmọ́.",
      },
      elekes: {
        name: "Elekes",
        description:
          "Àwọn necklace àti beadwork tí a ṣe pẹ̀lú ìtọ́jú.",
      },
      sets: {
        name: "Sets",
        description:
          "Àwọn àkójọpọ̀ ẹ̀mí àti ayẹyẹ tí a ṣètò pọ̀.",
      },
      mazos: {
        name: "Mazos",
        description:
          "Àwọn staff ayẹyẹ àti ohun èlò beadwork pẹ̀lú ìwòye rírẹwà.",
      },
      iruke: {
        name: "Iruke",
        description:
          "Àwọn nkan Iruke àti nkan ẹ̀mí míì tí a ń mura sílẹ̀.",
      },
      irofa: {
        name: "Irofa",
        description:
          "Àwọn nkan Irofa àti nkan ẹ̀mí míì tí a ń mura sílẹ̀.",
      },
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
