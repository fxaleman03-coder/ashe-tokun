export type Tradition = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
};

export const localTraditions: Tradition[] = [
  {
    id: "local-ifa",
    name: "Ifá",
    slug: "ifa",
    description: "Products connected to Ifá practice and symbolism.",
    active: true,
  },
  {
    id: "local-orisha",
    name: "Orisha",
    slug: "orisha",
    description: "Orisha devotional and ceremonial products.",
    active: true,
  },
  {
    id: "local-abakua",
    name: "Abakuá",
    slug: "abakua",
    description: "Catalog grouping for future Abakuá products.",
    active: true,
  },
  {
    id: "local-palo",
    name: "Palo",
    slug: "palo",
    description: "Catalog grouping for future Palo products.",
    active: true,
  },
  {
    id: "local-espiritismo",
    name: "Espiritismo",
    slug: "espiritismo",
    description: "Spiritual supply and devotional products.",
    active: true,
  },
  {
    id: "local-christian",
    name: "Christian",
    slug: "christian",
    description: "Christian devotional articles and gifts.",
    active: true,
  },
];
