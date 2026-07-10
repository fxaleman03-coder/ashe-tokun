export type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  active: boolean;
};

export const localBrands: Brand[] = [
  {
    id: "local-ajako-originals",
    name: "AJAKO ORIGINALS",
    slug: "ajako-originals",
    description: "In-house brand sold inside ASHE TOKUN.",
    logo_url: null,
    active: true,
  },
  {
    id: "local-odibere-creations",
    name: "ODIBERE CREATIONS",
    slug: "odibere-creations",
    description: "Artisan partner brand sold inside ASHE TOKUN.",
    logo_url: null,
    active: true,
  },
];
