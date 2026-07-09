"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { products as seedProducts, type Product } from "@/lib/products";

const productOverridesKey = "ashe-tokun-product-overrides";
const productOverridesEvent = "ashe-tokun-product-overrides-updated";
const languages = ["en", "es", "yo"] as const;

type LocalizedProductField = Product["name"];

export type ProductOverride = {
  vendor?: Product["vendor"];
  name?: string;
  category?: string;
  tradition?: string;
  price?: number;
  compareAtPrice?: number | null;
  stock?: number;
  image?: string | null;
  isFeatured?: boolean;
  isNew?: boolean;
  shortDescription?: string;
};

type ProductOverrides = Record<string, ProductOverride>;

function toLocalizedText(
  value: string | undefined,
  fallback: LocalizedProductField,
): LocalizedProductField {
  if (!value) {
    return fallback;
  }

  return languages.reduce((localized, language) => {
    localized[language] = value;
    return localized;
  }, {} as LocalizedProductField);
}

function readOverrides(): ProductOverrides {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedOverrides = window.localStorage.getItem(productOverridesKey);
    return storedOverrides ? JSON.parse(storedOverrides) : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: ProductOverrides) {
  window.localStorage.setItem(productOverridesKey, JSON.stringify(overrides));
  window.dispatchEvent(new Event(productOverridesEvent));
}

export function mergeProductOverride(
  product: Product,
  override?: ProductOverride,
): Product {
  if (!override) {
    return product;
  }

  return {
    ...product,
    vendor: override.vendor ?? product.vendor,
    name: toLocalizedText(override.name, product.name),
    category: toLocalizedText(override.category, product.category),
    tradition: toLocalizedText(override.tradition, product.tradition),
    price: typeof override.price === "number" ? override.price : product.price,
    compareAtPrice:
      override.compareAtPrice === null
        ? undefined
        : typeof override.compareAtPrice === "number"
          ? override.compareAtPrice
          : product.compareAtPrice,
    image: override.image === undefined ? product.image : override.image,
    inStock:
      typeof override.stock === "number"
        ? override.stock > 0
        : product.inStock,
    isFeatured:
      typeof override.isFeatured === "boolean"
        ? override.isFeatured
        : product.isFeatured,
    isNew: typeof override.isNew === "boolean" ? override.isNew : product.isNew,
    shortDescription: toLocalizedText(
      override.shortDescription,
      product.shortDescription,
    ),
  };
}

export function mergeProductCatalog(
  catalog: Product[],
  overrides: ProductOverrides,
) {
  return catalog.map((product) =>
    mergeProductOverride(product, overrides[product.slug]),
  );
}

export function getProductOverride(slug: string) {
  return readOverrides()[slug];
}

export function saveProductOverride(slug: string, override: ProductOverride) {
  const overrides = readOverrides();
  writeOverrides({
    ...overrides,
    [slug]: override,
  });
}

export function resetProductOverride(slug: string) {
  const overrides = readOverrides();
  delete overrides[slug];
  writeOverrides(overrides);
}

export function useProductCatalog() {
  const [overrides, setOverrides] = useState<ProductOverrides>(() =>
    readOverrides(),
  );

  const refreshOverrides = useCallback(() => {
    setOverrides(readOverrides());
  }, []);

  useEffect(() => {
    window.addEventListener("storage", refreshOverrides);
    window.addEventListener(productOverridesEvent, refreshOverrides);

    return () => {
      window.removeEventListener("storage", refreshOverrides);
      window.removeEventListener(productOverridesEvent, refreshOverrides);
    };
  }, [refreshOverrides]);

  return useMemo(() => mergeProductCatalog(seedProducts, overrides), [overrides]);
}

export function useProduct(slug: string) {
  const catalog = useProductCatalog();

  return useMemo(
    () => catalog.find((product) => product.slug === slug),
    [catalog, slug],
  );
}
