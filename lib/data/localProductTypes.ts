export type ProductType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
};

export const localProductTypes: ProductType[] = [
  {
    id: "local-physical-product",
    name: "Physical Product",
    slug: "physical-product",
    description: "Standard shippable storefront item.",
    active: true,
  },
  {
    id: "local-handmade-product",
    name: "Handmade Product",
    slug: "handmade-product",
    description: "Handcrafted or hand-finished piece.",
    active: true,
  },
  {
    id: "local-made-to-order",
    name: "Made to Order",
    slug: "made-to-order",
    description: "Produced or customized after purchase inquiry.",
    active: true,
  },
];
