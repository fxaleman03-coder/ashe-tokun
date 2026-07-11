import { getCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/productsRepository";
import type { Product } from "@/lib/products";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  representativeImage: string | null;
  representativeProductSlug: string | null;
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
};

const categoryPlaceholders: Record<string, string> = {
  ifa: "/categories/ifa.svg",
  orisha: "/categories/orisa.svg",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductCategoryKeys(product: Product) {
  const keys = new Set<string>();

  keys.add(slugify(product.category.en));

  if (product.collection?.en) {
    keys.add(slugify(product.collection.en));
  }

  if (product.productType?.en) {
    keys.add(slugify(product.productType.en));
  }

  if (product.category.en === "Ide Sets") {
    keys.add("sets");
  }

  if (product.productType?.en === "Keychain") {
    keys.add("keychains");
  }

  if (product.sku.startsWith("AJO-OPE")) keys.add("opele");
  if (product.sku.startsWith("AJO-KEY")) keys.add("keychains");
  if (product.sku.startsWith("ODI-IDE")) keys.add("ide");
  if (product.sku.startsWith("ODI-SET")) keys.add("sets");
  if (product.sku.startsWith("ODI-MAZ")) keys.add("mazos");

  return keys;
}

function getEligibleProductsForCategory(
  products: Product[],
  categorySlug: string,
) {
  return products.filter(
    (product) =>
      product.availableOnline &&
      getProductCategoryKeys(product).has(categorySlug),
  );
}

function getRepresentativeProduct(products: Product[]) {
  return (
    products.find((product) => product.isFeatured && product.image) ??
    products.find((product) => product.image) ??
    products[0] ??
    null
  );
}

function normalizeCategory(
  category: CategoryRecord,
  products: Product[],
): StorefrontCategory {
  const slug = category.slug || slugify(category.name);
  const categoryProducts = getEligibleProductsForCategory(products, slug);
  const representativeProduct = getRepresentativeProduct(categoryProducts);

  return {
    id: category.id,
    name: category.name,
    slug,
    description: category.description ?? "",
    productCount: categoryProducts.length,
    representativeImage:
      representativeProduct?.image ?? categoryPlaceholders[slug] ?? null,
    representativeProductSlug: representativeProduct?.slug ?? null,
  };
}

export async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);
  const seenSlugs = new Set<string>();

  return categories
    .map((category) => {
      const slug = category.slug || slugify(category.name);

      return {
        category,
        slug,
      };
    })
    .filter(({ category, slug }) => {
      if (!category.active || seenSlugs.has(slug)) {
        return false;
      }

      seenSlugs.add(slug);
      return true;
    })
    .map(({ category }) => normalizeCategory(category, products))
    .filter((category) => category.productCount > 0)
    .sort((first, second) => first.name.localeCompare(second.name));
}

export async function getStorefrontCategoryBySlug(slug: string) {
  const normalizedSlug = slugify(slug);
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);
  const category =
    categories.find(
      (candidate) =>
        candidate.active &&
        (candidate.slug === normalizedSlug ||
          slugify(candidate.name) === normalizedSlug),
    ) ?? null;

  return category ? normalizeCategory(category, products) : null;
}

export async function getProductsForStorefrontCategory(slug: string) {
  const normalizedSlug = slugify(slug);
  const products = await getProducts();

  return getEligibleProductsForCategory(products, normalizedSlug).sort(
    (first, second) => first.name.en.localeCompare(second.name.en),
  );
}
