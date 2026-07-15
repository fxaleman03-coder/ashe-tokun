export type CatalogStatus = "Active" | "Draft";

export type Vendor = {
  id: string;
  name: string;
  role: string;
  description: string;
  status: CatalogStatus;
};

export type CatalogEntry = {
  id: string;
  name: string;
  description: string;
  status: CatalogStatus;
};

export type Category = CatalogEntry & {
  type: string;
  parent?: string;
};

export type ProductType = {
  id: string;
  name: string;
  description: string;
  useCase: string;
};

export type Tradition = {
  id: string;
  name: string;
  description: string;
  storefrontVisibility: string;
};

export const vendors: Vendor[] = [
  {
    id: "ajako-originals",
    name: "AJAKO ORIGINALS",
    role: "Official in-house brand",
    description: "Designed and manufactured by AJAKO for original collections.",
    status: "Active",
  },
  {
    id: "edibere-creation",
    name: "EDIBERE CREATION",
    role: "Official artisan partner",
    description: "Handcrafted beadwork, sets, and ceremonial bead pieces.",
    status: "Active",
  },
];

const collectionSeeds: Array<[string, string, string]> = [
  ["ajako-originals", "AJAKO Originals", "In-house original product line."],
  ["edibere-creation", "EDIBERE Creation", "Partner artisan beadwork collection."],
  ["new-arrivals", "New Arrivals", "Recently added products and seasonal additions."],
  ["best-sellers", "Best Sellers", "High-interest products for merchandising."],
  ["limited-edition", "Limited Edition", "Scarce or limited production pieces."],
  ["handcrafted", "Handcrafted", "Products finished or assembled by hand."],
  ["sacred-arts", "Sacred Arts", "Artistic and ceremonial visual works."],
  ["keychains", "Keychains", "Symbolic everyday collectibles."],
  ["ide-collection", "Ide Collection", "Bracelets, sets, and related beadwork."],
  ["ceremonial-tools", "Ceremonial Tools", "Tools for ritual, devotional, and display use."],
];

export const collections: CatalogEntry[] = collectionSeeds.map(
  ([id, name, description]) => ({
  id,
  name,
  description,
  status: "Active" as const,
}),
);

const categorySeeds: Array<[string, string, string, string | undefined]> = [
  ["ide", "Ide", "Beadwork", "EDIBERE Creation"],
  ["elekes", "Elekes", "Beadwork", "EDIBERE Creation"],
  ["sets", "Sets", "Beadwork", "EDIBERE Creation"],
  ["keychains", "Keychains", "AJAKO Originals", "AJAKO Originals"],
  ["opele", "Opele", "AJAKO Originals", "AJAKO Originals"],
  ["opon", "Opon", "AJAKO Originals", "AJAKO Originals"],
  ["mazos", "Mazos", "Ceremonial Tools", "EDIBERE Creation"],
  ["iruke", "Iruke", "Ceremonial Tools", undefined],
  ["irofa", "Irofa", "Ceremonial Tools", undefined],
  ["bastones", "Bastones", "Ceremonial Tools", "EDIBERE Creation"],
  ["medallions", "Medallions", "AJAKO Originals", "AJAKO Originals"],
  ["lamps", "Lamps", "AJAKO Originals", "AJAKO Originals"],
  ["books", "Books", "Devotional Articles", undefined],
  ["candles", "Candles", "Spiritual Supplies", undefined],
  ["oils", "Oils", "Spiritual Supplies", undefined],
  ["herbs", "Herbs", "Spiritual Supplies", undefined],
  ["baths", "Baths", "Spiritual Supplies", undefined],
  ["jewelry", "Jewelry", "Accessories", undefined],
  ["abakua", "Abakua", "Tradition", undefined],
  ["orisha", "Orisha", "Tradition", undefined],
  ["ifa", "Ifa", "Tradition", undefined],
  ["espiritismo", "Espiritismo", "Tradition", undefined],
  ["palo", "Palo", "Tradition", undefined],
  ["christian", "Christian", "Tradition", undefined],
];

export const categories: Category[] = categorySeeds.map(
  ([id, name, type, parent]) => ({
  id,
  name,
  type,
  parent,
  description: `${name} catalog grouping.`,
  status: "Active" as const,
}),
);

export const productTypes: ProductType[] = [
  {
    id: "physical-product",
    name: "Physical Product",
    description: "Standard shippable storefront item.",
    useCase: "Most catalog products and store inventory.",
  },
  {
    id: "handmade-product",
    name: "Handmade Product",
    description: "Handcrafted or hand-finished piece.",
    useCase: "AJAKO originals, beadwork, tools, and artisan products.",
  },
  {
    id: "made-to-order",
    name: "Made to Order",
    description: "Produced or customized after purchase inquiry.",
    useCase: "Custom Opele, bespoke beadwork, and special requests.",
  },
  {
    id: "digital-product",
    name: "Digital Product",
    description: "Non-physical downloadable or digital offering.",
    useCase: "Future guides, digital references, or educational files.",
  },
  {
    id: "bundle",
    name: "Bundle",
    description: "Multiple products sold together.",
    useCase: "Sets, kits, and curated devotional groupings.",
  },
  {
    id: "one-of-a-kind",
    name: "One of a Kind",
    description: "Unique item with a single available instance.",
    useCase: "Rare ceremonial pieces, art objects, and custom works.",
  },
];

const traditionSeeds: Array<[string, string, string]> = [
  ["ifa", "Ifá", "Products connected to Ifá practice and symbolism."],
  ["orisha", "Orisha", "Orisha devotional and ceremonial products."],
  ["abakua", "Abakuá", "Catalog grouping for future Abakuá products."],
  ["palo", "Palo", "Catalog grouping for future Palo products."],
  ["espiritismo", "Espiritismo", "Spiritual supply and devotional products."],
  ["christian", "Christian", "Christian devotional articles and gifts."],
  ["ajako-originals", "AJAKO Originals", "In-house ASHE TOKUN original line."],
  ["edibere-creation", "EDIBERE Creation", "Official artisan partner line."],
];

export const traditions: Tradition[] = traditionSeeds.map(
  ([id, name, description]) => ({
  id,
  name,
  description,
  storefrontVisibility: "Visible",
}),
);
