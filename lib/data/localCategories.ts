export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_category_id: string | null;
  active: boolean;
};

export const localCategories: Category[] = [
  {
    id: "local-keychains",
    name: "Keychains",
    slug: "keychains",
    description: "Symbolic everyday collectibles.",
    parent_category_id: null,
    active: true,
  },
  {
    id: "local-opele",
    name: "Opele",
    slug: "opele",
    description: "Opele products and related AJAKO Originals pieces.",
    parent_category_id: null,
    active: true,
  },
  {
    id: "local-opon",
    name: "Opon",
    slug: "opon",
    description: "Opon products and related ceremonial display pieces.",
    parent_category_id: null,
    active: true,
  },
  {
    id: "local-ide",
    name: "Ide",
    slug: "ide",
    description: "Bracelets and related beadwork.",
    parent_category_id: null,
    active: true,
  },
  {
    id: "local-elekes",
    name: "Elekes",
    slug: "elekes",
    description: "Traditional necklaces and related beadwork.",
    parent_category_id: null,
    active: true,
  },
  {
    id: "local-sets",
    name: "Sets",
    slug: "sets",
    description: "Coordinated product and beadwork sets.",
    parent_category_id: null,
    active: true,
  },
  {
    id: "local-mazos",
    name: "Mazos",
    slug: "mazos",
    description: "Ceremonial tools and related beadwork pieces.",
    parent_category_id: null,
    active: true,
  },
];
