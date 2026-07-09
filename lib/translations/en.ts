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
  traditions: {
    label: "Explore Our Traditions",
    heading: "Sacred essentials, selected with care.",
    subtitle:
      "Discover ceremonial categories shaped by devotion, heritage, and refined spiritual practice.",
    cardButton: "Explore",
    cards: [
      {
        title: "Ifá",
        description:
          "Traditional articles and tools connected to wisdom, guidance, and sacred study.",
        imageSrc: "/categories/ifa.svg",
        imageAlt: "Ifá category placeholder",
      },
      {
        title: "Òrìṣà",
        description:
          "Devotional pieces and ceremonial essentials honoring revered spiritual traditions.",
        imageSrc: "/categories/orisa.svg",
        imageAlt: "Òrìṣà category placeholder",
      },
      {
        title: "Spiritual Supplies",
        description:
          "Premium supplies for cleansing, preparation, offerings, and intentional practice.",
        imageSrc: "/categories/spiritual-supplies.svg",
        imageAlt: "Spiritual supplies category placeholder",
      },
      {
        title: "Devotional Articles",
        description:
          "Elegant religious articles crafted for daily reverence, reflection, and devotion.",
        imageSrc: "/categories/devotional-articles.svg",
        imageAlt: "Devotional articles category placeholder",
      },
    ],
  },
  featuredProducts: {
    label: "Featured Products",
    heading: "Featured Products",
    subtitle:
      "Hand-selected spiritual articles for devotion, ceremony, and daily practice.",
    labels: {
      viewProduct: "View Product",
      addToCart: "Add to Cart",
      inStock: "In Stock",
      soldOut: "Sold Out",
      new: "New",
      featured: "Featured",
    },
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
