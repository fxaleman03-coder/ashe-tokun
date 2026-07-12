export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  active: boolean;
};

export const localCollections: Collection[] = [
  {
    id: "local-new-arrivals",
    name: "New Arrivals",
    slug: "new-arrivals",
    description: "Recently added products and seasonal additions.",
    featured: true,
    active: true,
  },
  {
    id: "local-best-sellers",
    name: "Best Sellers",
    slug: "best-sellers",
    description: "High-interest products for merchandising.",
    featured: true,
    active: true,
  },
  {
    id: "local-ajako-originals",
    name: "AJAKO Originals",
    slug: "ajako-originals",
    description: "In-house original product line.",
    featured: false,
    active: true,
  },
  {
    id: "local-edibere-creation",
    name: "EDIBERE Creation",
    slug: "edibere-creation",
    description: "Partner artisan beadwork collection.",
    featured: false,
    active: true,
  },
];
