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
      inStock: "Ready to Ship",
      soldOut: "Currently Unavailable",
      new: "New",
      featured: "Featured",
      newArrival: "New Arrival",
      ajakoOriginals: "AJAKO Originals",
      handcrafted: "Handcrafted",
      limitedEdition: "Limited Edition",
      bestSeller: "Best Seller",
    },
  },
  productPage: {
    breadcrumbHome: "Home",
    breadcrumbShop: "Shop",
    details: "Details",
    materials: "Materials",
    spiritualNote: "Spiritual Note",
    shipping: "Shipping",
    addToCart: "Add to Cart",
    backToShop: "Back to Shop",
    productNotFound: "Product not found",
    productNotFoundDescription:
      "This item is not available in the ASHE TOKUN catalog right now.",
    detailsPlaceholder:
      "A premium ASHE TOKUN selection prepared for ceremonial, devotional, or daily spiritual use.",
    materialsPlaceholder:
      "Material details will be confirmed as the official product catalog is finalized.",
    spiritualNotePlaceholder:
      "Cultural and spiritual guidance will be reviewed with knowledgeable practitioners before publication.",
    shippingPlaceholder:
      "Shipping options and handling times will be added before checkout functionality launches.",
  },
  storefront: {
    categorySection: {
      homeLabel: "Shop by Category",
      homeHeading: "Explore our collections",
      homeSubtitle:
        "Enter the store through focused ceremonial and devotional categories, each curated for clear discovery.",
      shopLabel: "Explore ASHE TOKUN",
      shopHeading: "Shop",
      shopSubtitle:
        "Browse our categories across spiritual articles, ceremonial tools, handcrafted pieces, and devotional essentials.",
      viewCategory: "View Category",
      productSingular: "Product",
      productPlural: "Products",
      noCategoriesTitle: "No categories available",
      noCategoriesAvailable:
        "Category collections are being prepared for the storefront.",
      featuredCategory: "Featured Category",
      availableOnline: "Available Online",
      category: "Category",
      categories: "Categories",
      genericCategoryDescription:
        "Explore this ASHE TOKUN category as new products become available.",
    },
    categoryPage: {
      breadcrumbLabel: "Breadcrumb",
      breadcrumbHome: "Home",
      breadcrumbShop: "Shop",
      label: "Category",
      noProductsTitle: "No products available",
      noProductsAvailable:
        "This category does not have available products yet.",
      backToShop: "Back to Shop",
    },
    categoryLabels: {
      keychains: {
        name: "Keychains",
        description:
          "Symbolic everyday collectibles from ASHE TOKUN and its featured brands.",
      },
      opele: {
        name: "Opele",
        description:
          "Opele pieces and related ceremonial selections prepared for Ifá practice.",
      },
      opon: {
        name: "Opon",
        description:
          "Opon products and display pieces connected to refined ceremonial work.",
      },
      ide: {
        name: "Ide",
        description:
          "Bracelets and beadwork selected for devotion, ceremony, and daily wear.",
      },
      elekes: {
        name: "Elekes",
        description:
          "Necklaces and beadwork pieces shaped by tradition and careful handwork.",
      },
      sets: {
        name: "Sets",
        description:
          "Coordinated spiritual and ceremonial sets for complete presentation.",
      },
      mazos: {
        name: "Mazos",
        description:
          "Ceremonial staffs and beadwork tools with a refined ritual presence.",
      },
      iruke: {
        name: "Iruke",
        description:
          "Iruke ceremonial items and related spiritual pieces prepared for future availability.",
      },
      irofa: {
        name: "Irofa",
        description:
          "Irofa ceremonial items and related spiritual pieces prepared for future availability.",
      },
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
