"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { productVendors, type Product, type ProductVendor } from "@/lib/products";
import {
  mergeProductOverride,
  resetProductOverride,
  saveProductOverride,
  useProductOverride,
} from "@/lib/productStore";

type EditProductFormProps = {
  product: Product;
};

type ProductStatus = "Draft" | "Active" | "Archived";
type ProductVisibility = "Storefront" | "Hidden";

type EditProductFormState = {
  vendor: ProductVendor;
  name: string;
  category: string;
  tradition: string;
  productType: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  sku: string;
  barcode: string;
  vendorSku: string;
  stock: string;
  reorderLevel: string;
  inventoryLocation: string;
  availableOnline: boolean;
  availableInStore: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  isLimitedEdition: boolean;
  isHandcrafted: boolean;
  collectionAjako: boolean;
  collectionOdibere: boolean;
  seoTitle: string;
  seoDescription: string;
  status: ProductStatus;
  visibility: ProductVisibility;
};

function formatInputPrice(price?: number) {
  return typeof price === "number" ? price.toFixed(2) : "";
}

function getSku(product: Product) {
  return product.sku;
}

function getDefaultStock(product: Product) {
  return String(product.stock);
}

function toFormState(product: Product, stock?: number): EditProductFormState {
  return {
    vendor: product.vendor,
    name: product.name.en,
    category: product.category.en,
    tradition: product.tradition.en,
    productType: product.productType?.en ?? "",
    shortDescription: product.shortDescription.en,
    fullDescription: "",
    image: product.image ?? "",
    price: formatInputPrice(product.price),
    compareAtPrice: formatInputPrice(product.compareAtPrice),
    cost: formatInputPrice(product.cost),
    sku: getSku(product),
    barcode: product.barcode,
    vendorSku: product.vendorSku ?? "",
    stock: typeof stock === "number" ? String(stock) : getDefaultStock(product),
    reorderLevel:
      typeof product.reorderLevel === "number" ? String(product.reorderLevel) : "",
    inventoryLocation: product.inventoryLocation ?? "",
    availableOnline: product.availableOnline,
    availableInStore: product.availableInStore,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isBestSeller: false,
    isLimitedEdition: false,
    isHandcrafted: true,
    collectionAjako: product.vendor === "AJAKO ORIGINALS",
    collectionOdibere: product.vendor === "ODIBERE CREATIONS",
    seoTitle: "",
    seoDescription: "",
    status: "Draft",
    visibility: "Storefront",
  };
}

function parseOptionalPrice(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parseOptionalNumber(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function formatEstimatedMargin(price: string, cost: string) {
  const parsedPrice = Number(price);
  const parsedCost = Number(cost);

  if (
    !Number.isFinite(parsedPrice) ||
    !Number.isFinite(parsedCost) ||
    parsedPrice <= 0
  ) {
    return "Estimated margin display placeholder";
  }

  const margin = ((parsedPrice - parsedCost) / parsedPrice) * 100;
  return `${margin.toFixed(1)}% estimated margin`;
}

function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <p className="text-[0.66rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
        {label}
      </span>
      <div className="mt-3">{children}</div>
    </label>
  );
}

const inputClass =
  "min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70";
const textareaClass =
  "w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70";

type ProductStudioFormProps = EditProductFormProps & {
  seedProduct: Product;
  stock?: number;
};

function ProductStudioForm({
  product,
  seedProduct,
  stock,
}: ProductStudioFormProps) {
  const seedFormState = useMemo(() => toFormState(seedProduct), [seedProduct]);
  const [formState, setFormState] = useState(() => toFormState(product, stock));
  const [message, setMessage] = useState("");

  const canPreviewImage = formState.image.startsWith("/");

  function updateField<Field extends keyof EditProductFormState>(
    field: Field,
    value: EditProductFormState[Field],
  ) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  }

  function handleSave() {
    const parsedPrice = Number(formState.price);
    const parsedStock = Number(formState.stock);

    saveProductOverride(product.slug, {
      name: formState.name.trim() || seedProduct.name.en,
      vendor: formState.vendor,
      sku: formState.sku.trim() || seedProduct.sku,
      barcode: formState.barcode.trim() || seedProduct.barcode,
      vendorSku: formState.vendorSku.trim(),
      category: formState.category.trim() || seedProduct.category.en,
      tradition: formState.tradition.trim() || seedProduct.tradition.en,
      productType: formState.productType.trim(),
      price: Number.isFinite(parsedPrice) ? parsedPrice : seedProduct.price,
      compareAtPrice: parseOptionalPrice(formState.compareAtPrice),
      cost: parseOptionalNumber(formState.cost),
      stock: Number.isFinite(parsedStock) ? parsedStock : 0,
      reorderLevel: parseOptionalNumber(formState.reorderLevel),
      inventoryLocation: formState.inventoryLocation.trim(),
      availableOnline: formState.availableOnline,
      availableInStore: formState.availableInStore,
      image: formState.image.trim() || null,
      isFeatured: formState.isFeatured,
      isNew: formState.isNew,
      shortDescription:
        formState.shortDescription.trim() || seedProduct.shortDescription.en,
    });
    setMessage("Product changes saved locally in this browser.");
  }

  function handleReset() {
    resetProductOverride(product.slug);
    setFormState(seedFormState);
    setMessage("Local changes reset for this product.");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
      className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]"
    >
      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
            Product Studio
          </p>
          <div className="relative mt-5 aspect-square overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(216,163,68,0.18),transparent_32%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
            {canPreviewImage ? (
              <Image
                src={formState.image}
                alt={formState.name}
                fill
                sizes="22rem"
                className="object-contain p-6 drop-shadow-[0_26px_34px_rgba(0,0,0,0.62)]"
              />
            ) : (
              <div className="absolute inset-6 flex items-center justify-center border border-[#f7ead2]/8 text-center text-xs uppercase tracking-[0.2em] text-[#e8dcc8]/38">
                Image Preview
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            <h2 className="font-serif text-2xl font-semibold leading-tight text-[#f7ead2]">
              {formState.name}
            </h2>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {formState.vendor}
            </p>
            <p className="text-sm leading-6 text-[#e8dcc8]/64">
              {formState.category} / {formState.tradition}
            </p>
            <p className="text-lg font-semibold text-[#f7ead2]">
              ${Number(formState.price || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="border border-[#d8a344]/20 bg-[#0f0b07] p-5 text-sm leading-6 text-[#e8dcc8]/70">
          Local changes are saved in this browser only until database
          integration.
        </div>
      </aside>

      <div className="space-y-6">
        {message ? (
          <p className="border border-[#d8a344]/35 bg-[#d8a344]/10 px-5 py-4 text-sm font-medium text-[#f7ead2]">
            {message}
          </p>
        ) : null}

        <SectionCard title="General" eyebrow="01">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldLabel label="Product Name">
              <input
                type="text"
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Vendor">
              <select
                value={formState.vendor}
                onChange={(event) =>
                  updateField("vendor", event.target.value as ProductVendor)
                }
                className={inputClass}
              >
                {productVendors.map((vendor) => (
                  <option key={vendor} value={vendor}>
                    {vendor}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Category">
              <input
                type="text"
                value={formState.category}
                onChange={(event) => updateField("category", event.target.value)}
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Tradition">
              <input
                type="text"
                value={formState.tradition}
                onChange={(event) =>
                  updateField("tradition", event.target.value)
                }
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Product Type">
              <input
                type="text"
                value={formState.productType}
                onChange={(event) =>
                  updateField("productType", event.target.value)
                }
                placeholder="Bracelet, keychain, opele, ceremonial tool..."
                className={inputClass}
              />
            </FieldLabel>
          </div>
          <div className="mt-5 grid gap-5">
            <FieldLabel label="Short Description">
              <textarea
                value={formState.shortDescription}
                onChange={(event) =>
                  updateField("shortDescription", event.target.value)
                }
                className={`${textareaClass} min-h-28`}
              />
            </FieldLabel>
            <FieldLabel label="Full Description">
              <textarea
                value={formState.fullDescription}
                onChange={(event) =>
                  updateField("fullDescription", event.target.value)
                }
                placeholder="Long-form product story, care instructions, and cultural context placeholder."
                className={`${textareaClass} min-h-36`}
              />
            </FieldLabel>
          </div>
        </SectionCard>

        <SectionCard title="Media" eyebrow="02">
          <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="relative aspect-square overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(216,163,68,0.16),transparent_32%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
              {canPreviewImage ? (
                <Image
                  src={formState.image}
                  alt={formState.name}
                  fill
                  sizes="16rem"
                  className="object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
                />
              ) : null}
            </div>
            <div>
              <FieldLabel label="Image Path">
                <input
                  type="text"
                  value={formState.image}
                  onChange={(event) => updateField("image", event.target.value)}
                  className={inputClass}
                />
              </FieldLabel>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
                >
                  Choose from Media Library
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/16 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                >
                  Preview Image
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#e8dcc8]/58">
                Media selection will be connected in a future phase.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Pricing" eyebrow="03">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldLabel label="Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.price}
                onChange={(event) => updateField("price", event.target.value)}
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Compare At Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.compareAtPrice}
                onChange={(event) =>
                  updateField("compareAtPrice", event.target.value)
                }
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Cost">
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.cost}
                onChange={(event) => updateField("cost", event.target.value)}
                placeholder="Cost placeholder"
                className={inputClass}
              />
            </FieldLabel>
            <div className="border border-[#d8a344]/20 bg-[#0f0b07] px-4 py-4 text-sm leading-6 text-[#e8dcc8]/70">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                Estimated Margin
              </p>
              <p className="mt-2">
                {formatEstimatedMargin(formState.price, formState.cost)}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Inventory" eyebrow="04">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldLabel label="SKU">
              <input
                type="text"
                value={formState.sku}
                onChange={(event) => updateField("sku", event.target.value)}
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Barcode">
              <input
                type="text"
                value={formState.barcode}
                onChange={(event) => updateField("barcode", event.target.value)}
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Vendor SKU">
              <input
                type="text"
                value={formState.vendorSku}
                onChange={(event) =>
                  updateField("vendorSku", event.target.value)
                }
                placeholder="Vendor SKU"
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Quantity / Stock">
              <input
                type="number"
                min="0"
                step="1"
                value={formState.stock}
                onChange={(event) => updateField("stock", event.target.value)}
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Reorder Level">
              <input
                type="number"
                min="0"
                step="1"
                value={formState.reorderLevel}
                onChange={(event) =>
                  updateField("reorderLevel", event.target.value)
                }
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Inventory Location">
              <input
                type="text"
                value={formState.inventoryLocation}
                onChange={(event) =>
                  updateField("inventoryLocation", event.target.value)
                }
                placeholder="Inventory Location"
                className={inputClass}
              />
            </FieldLabel>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Available Online", "availableOnline"],
              ["Available In Store", "availableInStore"],
            ].map(([label, field]) => (
              <label
                key={field}
                className="flex items-center gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-4 text-sm font-medium text-[#e8dcc8]/78"
              >
                <input
                  type="checkbox"
                  checked={
                    formState[field as keyof EditProductFormState] as boolean
                  }
                  onChange={(event) =>
                    updateField(
                      field as "availableOnline" | "availableInStore",
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-[#d8a344]"
                />
                {label}
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Collections" eyebrow="05">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Featured", "isFeatured"],
              ["New Arrival", "isNew"],
              ["Best Seller", "isBestSeller"],
              ["Limited Edition", "isLimitedEdition"],
              ["Handcrafted", "isHandcrafted"],
              ["AJAKO Originals", "collectionAjako"],
              ["ODIBERE Creations", "collectionOdibere"],
            ].map(([label, field]) => (
              <label
                key={field}
                className="flex items-center gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-4 text-sm font-medium text-[#e8dcc8]/78"
              >
                <input
                  type="checkbox"
                  checked={
                    formState[field as keyof EditProductFormState] as boolean
                  }
                  onChange={(event) =>
                    updateField(
                      field as
                        | "isFeatured"
                        | "isNew"
                        | "isBestSeller"
                        | "isLimitedEdition"
                        | "isHandcrafted"
                        | "collectionAjako"
                        | "collectionOdibere",
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-[#d8a344]"
                />
                {label}
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="SEO" eyebrow="06">
          <div className="grid gap-5">
            <FieldLabel label="SEO Title">
              <input
                type="text"
                value={formState.seoTitle}
                onChange={(event) => updateField("seoTitle", event.target.value)}
                placeholder="SEO Title placeholder"
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="SEO Description">
              <textarea
                value={formState.seoDescription}
                onChange={(event) =>
                  updateField("seoDescription", event.target.value)
                }
                placeholder="SEO Description placeholder"
                className={`${textareaClass} min-h-28`}
              />
            </FieldLabel>
            <FieldLabel label="URL Slug">
              <input
                type="text"
                value={product.slug}
                readOnly
                className={`${inputClass} text-[#f7ead2]/58`}
              />
            </FieldLabel>
          </div>
        </SectionCard>

        <SectionCard title="Publishing" eyebrow="07">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldLabel label="Status">
              <select
                value={formState.status}
                onChange={(event) =>
                  updateField("status", event.target.value as ProductStatus)
                }
                className={inputClass}
              >
                {["Draft", "Active", "Archived"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Visibility">
              <select
                value={formState.visibility}
                onChange={(event) =>
                  updateField(
                    "visibility",
                    event.target.value as ProductVisibility,
                  )
                }
                className={inputClass}
              >
                {["Storefront", "Hidden"].map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>
          <p className="mt-6 border border-[#d8a344]/20 bg-[#0f0b07] px-5 py-4 text-sm leading-6 text-[#e8dcc8]/70">
            Local changes are saved in this browser only until database
            integration.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)]"
            >
              Save Product
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-12 items-center justify-center border border-[#f7ead2]/16 px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344]"
            >
              Reset Local Changes
            </button>
          </div>
        </SectionCard>
      </div>
    </form>
  );
}

export default function EditProductForm({ product }: EditProductFormProps) {
  const override = useProductOverride(product.slug);
  const studioProduct = mergeProductOverride(product, override);
  const studioKey = override ? `${product.slug}-local` : `${product.slug}-seed`;

  return (
    <ProductStudioForm
      key={studioKey}
      product={studioProduct}
      seedProduct={product}
      stock={override?.stock}
    />
  );
}
