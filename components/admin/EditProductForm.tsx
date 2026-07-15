"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { USE_SUPABASE } from "@/lib/config";
import { updateProduct } from "@/lib/data/productMutations";
import type { InventoryProductSummary } from "@/lib/data/inventoryRepository";
import {
  addProductMedia,
  removeProductMedia,
  reorderProductMedia,
  setPrimaryProductMedia,
  updateProductMediaAltText,
} from "@/lib/data/productMediaMutations";
import type { ProductMediaRecord } from "@/lib/data/productMediaRepository";
import type { MediaAsset } from "@/lib/data/mediaRepository";
import {
  productVendors,
  type Product,
  type ProductVendor,
} from "@/lib/products";
import {
  mergeProductOverride,
  resetProductOverride,
  useProductOverride,
} from "@/lib/productStore";

type EditProductFormProps = {
  product: Product;
  mediaAssets?: MediaAsset[];
  productMedia?: ProductMediaRecord[];
  inventorySummary?: InventoryProductSummary;
};

type ProductStatus = "Draft" | "Active" | "Archived";
type ProductVisibility = "Storefront" | "Hidden";
type DatabaseProductStatus = "draft" | "active" | "archived";

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
    collectionOdibere: product.vendor === "EDIBERE CREATION",
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

function formatOptionalDatabaseNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue.toFixed(2) : "";
}

function mapStatusToDatabase(status: ProductStatus): DatabaseProductStatus {
  if (status === "Active") {
    return "active";
  }

  if (status === "Archived") {
    return "archived";
  }

  return "draft";
}

function mapStatusFromDatabase(
  status: DatabaseProductStatus | string | null | undefined,
): ProductStatus {
  if (status === "active") {
    return "Active";
  }

  if (status === "archived") {
    return "Archived";
  }

  return "Draft";
}

function formatEstimatedMargin(price: string, cost: string) {
  const parsedPrice = Number(price);
  const parsedCost = Number(cost);

  if (
    !Number.isFinite(parsedPrice) ||
    !Number.isFinite(parsedCost) ||
    parsedPrice <= 0
  ) {
    return "Enter price and cost to calculate margin.";
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
  mediaAssets = [],
  productMedia = [],
  inventorySummary,
  seedProduct,
  stock,
}: ProductStudioFormProps) {
  const router = useRouter();
  const seedFormState = useMemo(() => toFormState(seedProduct), [seedProduct]);
  const [formState, setFormState] = useState(() => toFormState(product, stock));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [linkedMedia, setLinkedMedia] = useState(productMedia);

  const primaryMedia = linkedMedia.find((media) => media.is_primary) ?? null;
  const primaryPreviewUrl = primaryMedia?.media_asset.public_url ?? formState.image;
  const canPreviewImage =
    primaryPreviewUrl.startsWith("/") || primaryPreviewUrl.startsWith("http");
  const filteredStudioMediaAssets = useMemo(() => {
    const normalizedQuery = mediaQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return mediaAssets;
    }

    return mediaAssets.filter(
      (image) =>
        image.filename.toLowerCase().includes(normalizedQuery) ||
        image.folder.toLowerCase().includes(normalizedQuery) ||
        image.category.toLowerCase().includes(normalizedQuery),
    );
  }, [mediaAssets, mediaQuery]);

  function updateField<Field extends keyof EditProductFormState>(
    field: Field,
    value: EditProductFormState[Field],
  ) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  }

  function openMediaPicker() {
    setIsMediaPickerOpen(true);
  }

  async function handleAddGalleryMedia(asset: MediaAsset) {
    if (asset.source !== "supabase") {
      setMessage("Gallery image linking requires a Supabase media asset.");
      return;
    }

    const shouldSetPrimary = linkedMedia.length === 0;
    const result = shouldSetPrimary
      ? await setPrimaryProductMedia(product.id, asset.id)
      : await addProductMedia(product.id, asset.id);

    if (!result.ok) {
      setMessage(`Image linking failed: ${result.error}`);
      return;
    }

    const row = "row" in result ? result.row : null;

    if (row) {
      const linkedRecord = {
        ...row,
        media_asset: {
          id: asset.id,
          filename: asset.filename,
          public_url: asset.url,
          storage_path: asset.storage_path,
          asset_type: asset.asset_type,
          width: asset.width,
          height: asset.height,
          active: asset.active,
        },
      };

      setLinkedMedia((currentMedia) =>
        shouldSetPrimary
          ? [
              linkedRecord,
              ...currentMedia.map((media) => ({
                ...media,
                is_primary: false,
              })),
            ]
          : [...currentMedia, linkedRecord],
      );
      updateField("image", asset.url);
    }

    setIsMediaPickerOpen(false);
    router.refresh();
    setMessage(
      shouldSetPrimary
        ? "Primary image linked."
        : "Gallery image linked.",
    );
  }

  async function handleSetPrimaryMedia(media: ProductMediaRecord) {
    const result = await setPrimaryProductMedia(product.id, media.media_asset_id);

    if (!result.ok) {
      setMessage(`Primary image update failed: ${result.error}`);
      return;
    }

    setLinkedMedia((currentMedia) =>
      currentMedia.map((item) => ({
        ...item,
        is_primary: item.id === media.id,
        display_order: item.id === media.id ? 0 : item.display_order,
      })),
    );
    updateField("image", media.media_asset.public_url ?? "");
    setMessage("Primary image updated.");
    router.refresh();
  }

  async function handleRemoveMedia(media: ProductMediaRecord) {
    const result = await removeProductMedia(product.id, media.id);

    if (!result.ok) {
      setMessage(`Image removal failed: ${result.error}`);
      return;
    }

    const remainingMedia = linkedMedia.filter((item) => item.id !== media.id);
    const hasPrimary = remainingMedia.some((item) => item.is_primary);
    const promotedMedia =
      !hasPrimary && remainingMedia[0]
        ? remainingMedia.map((item, index) => ({
            ...item,
            is_primary: index === 0,
          }))
        : remainingMedia;

    setLinkedMedia(promotedMedia);
    updateField("image", promotedMedia[0]?.media_asset.public_url ?? "");
    setMessage("Image removed from product.");
    router.refresh();
  }

  async function handleMoveMedia(mediaIndex: number, direction: -1 | 1) {
    const nextIndex = mediaIndex + direction;

    if (nextIndex < 0 || nextIndex >= linkedMedia.length) {
      return;
    }

    const nextMedia = [...linkedMedia];
    const [movedMedia] = nextMedia.splice(mediaIndex, 1);
    nextMedia.splice(nextIndex, 0, movedMedia);

    const result = await reorderProductMedia(
      product.id,
      nextMedia.map((media) => media.id),
    );

    if (!result.ok) {
      setMessage(`Image reorder failed: ${result.error}`);
      return;
    }

    setLinkedMedia(
      nextMedia.map((media, index) => ({
        ...media,
        display_order: index,
      })),
    );
    setMessage("Gallery order updated.");
    router.refresh();
  }

  async function handleAltTextBlur(media: ProductMediaRecord, altText: string) {
    const result = await updateProductMediaAltText(media.id, altText);

    if (!result.ok) {
      setMessage(`Alt text update failed: ${result.error}`);
      return;
    }

    setMessage("Alt text updated.");
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage("Saving...");

    const parsedPrice = Number(formState.price);
    const parsedStock = Number(formState.stock);

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setIsSaving(false);
      setMessage("Save failed: Price must be a valid non-negative number.");
      return;
    }

    const productUpdates = {
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
      description:
        formState.fullDescription.trim() ||
        formState.shortDescription.trim() ||
        seedProduct.shortDescription.en,
      status: mapStatusToDatabase(formState.status),
      active: formState.visibility === "Storefront",
    };

    const result = await updateProduct(product.slug, productUpdates);

    setIsSaving(false);

    if (result.ok && result.source === "supabase") {
      setFormState((currentState) => ({
        ...currentState,
        name: result.product.name ?? currentState.name,
        shortDescription:
          result.product.short_description ?? currentState.shortDescription,
        fullDescription: result.product.description ?? currentState.fullDescription,
        price: formatOptionalDatabaseNumber(result.product.price),
        compareAtPrice: formatOptionalDatabaseNumber(
          result.product.compare_at_price,
        ),
        cost: formatOptionalDatabaseNumber(result.product.cost),
        sku: result.product.sku ?? currentState.sku,
        barcode: result.product.barcode ?? currentState.barcode,
        vendorSku: result.product.vendor_sku ?? currentState.vendorSku,
        availableOnline:
          result.product.available_online ?? currentState.availableOnline,
        availableInStore:
          result.product.available_in_store ?? currentState.availableInStore,
        isFeatured: result.product.featured ?? currentState.isFeatured,
        isNew: result.product.new_arrival ?? currentState.isNew,
        status: mapStatusFromDatabase(result.product.status),
        visibility:
          result.product.active === false ? "Hidden" : "Storefront",
      }));
      router.refresh();
      setMessage("Saved to Supabase.");
      return;
    }

    if (result.ok) {
      setMessage("Saved locally.");
      return;
    }

    setMessage(`Save failed: ${result.error}`);
  }

  function handleReset() {
    if (USE_SUPABASE) {
      setMessage("Save failed: Reset local changes is disabled while Supabase mode is active.");
      return;
    }

    resetProductOverride(product.slug);
    setFormState(seedFormState);
    setMessage("Local changes reset for this product.");
  }

  return (
    <>
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
              primaryPreviewUrl.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryPreviewUrl}
                  alt={formState.name}
                  className="absolute inset-0 h-full w-full object-contain p-6 drop-shadow-[0_26px_34px_rgba(0,0,0,0.62)]"
                />
              ) : (
                <Image
                  src={primaryPreviewUrl}
                  alt={formState.name}
                  fill
                  sizes="22rem"
                  className="object-contain p-6 drop-shadow-[0_26px_34px_rgba(0,0,0,0.62)]"
                />
              )
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
          {USE_SUPABASE
            ? "Supabase mode is active. Product Studio saves update the products table using the temporary development policy."
            : "Local changes are saved in this browser only until database integration."}
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
                placeholder="Long-form product story, care instructions, and cultural context."
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
                primaryPreviewUrl.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryPreviewUrl}
                    alt={formState.name}
                    className="absolute inset-0 h-full w-full object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
                  />
                ) : (
                  <Image
                    src={primaryPreviewUrl}
                    alt={formState.name}
                    fill
                    sizes="16rem"
                    className="object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
                  />
                )
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
                  onClick={openMediaPicker}
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
                Uploaded assets are stored in Supabase. Selecting one asset
                will add it to this product without deleting the asset itself.
              </p>
            </div>
          </div>

          <div className="mt-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                  Product Gallery
                </p>
                <p className="mt-2 text-sm leading-6 text-[#e8dcc8]/58">
                  One primary image plus ordered gallery images.
                </p>
              </div>
              <button
                type="button"
                onClick={openMediaPicker}
                className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
              >
                Add From Media Library
              </button>
            </div>

            {linkedMedia.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {linkedMedia.map((media, index) => (
                  <article
                    key={media.id}
                    className={`border bg-[#0f0b07] p-3 transition duration-500 ${
                      media.is_primary
                        ? "border-[#d8a344]/60 shadow-[0_0_34px_rgba(216,163,68,0.12)]"
                        : "border-[#f7ead2]/10 hover:border-[#d8a344]/40"
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#080503]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(216,163,68,0.14),transparent_34%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
                      {media.media_asset.public_url?.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={media.media_asset.public_url}
                          alt={media.alt_text ?? media.media_asset.filename}
                          className="absolute inset-0 h-full w-full object-contain p-4 drop-shadow-[0_20px_30px_rgba(0,0,0,0.58)]"
                        />
                      ) : media.media_asset.public_url ? (
                        <Image
                          src={media.media_asset.public_url}
                          alt={media.alt_text ?? media.media_asset.filename}
                          fill
                          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 100vw"
                          className="object-contain p-4 drop-shadow-[0_20px_30px_rgba(0,0,0,0.58)]"
                        />
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-[#f7ead2]">
                        {media.media_asset.filename}
                      </p>
                      {media.is_primary ? (
                        <span className="shrink-0 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                          Primary
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      value={media.alt_text ?? ""}
                      onChange={(event) => {
                        const altText = event.target.value;
                        setLinkedMedia((currentMedia) =>
                          currentMedia.map((item) =>
                            item.id === media.id
                              ? { ...item, alt_text: altText }
                              : item,
                          ),
                        );
                      }}
                      onBlur={(event) =>
                        handleAltTextBlur(media, event.target.value)
                      }
                      placeholder="Alt text"
                      className={`${inputClass} mt-3 min-h-10`}
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveMedia(index, -1)}
                        disabled={index === 0}
                        className="inline-flex min-h-9 items-center justify-center border border-[#f7ead2]/14 px-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#e8dcc8]/72 transition hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        Move Left
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveMedia(index, 1)}
                        disabled={index === linkedMedia.length - 1}
                        className="inline-flex min-h-9 items-center justify-center border border-[#f7ead2]/14 px-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#e8dcc8]/72 transition hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        Move Right
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryMedia(media)}
                        disabled={media.is_primary}
                        className="inline-flex min-h-9 items-center justify-center border border-[#d8a344]/35 px-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:cursor-not-allowed disabled:border-[#f7ead2]/10 disabled:text-[#e8dcc8]/36"
                      >
                        Set as Primary
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(media)}
                        className="inline-flex min-h-9 items-center justify-center border border-[#f7ead2]/14 px-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#e8dcc8]/72 transition hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 border border-[#f7ead2]/10 bg-[#0f0b07] p-5 text-sm leading-6 text-[#e8dcc8]/60">
                No product images linked yet. Add an asset from the Media Library
                to create the primary image.
              </p>
            )}
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
                placeholder="Cost"
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
            {!USE_SUPABASE ? (
              <>
                <FieldLabel label="Quantity / Stock">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.stock}
                    onChange={(event) =>
                      updateField("stock", event.target.value)
                    }
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
              </>
            ) : null}
          </div>
          {USE_SUPABASE ? (
            <div className="mt-6 border border-[#d8a344]/20 bg-[#0f0b07] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                    Live Inventory Summary
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/64">
                    Product stock is managed from inventory_items by location.
                    Product Studio keeps product identity and availability flags.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/admin/inventory"
                    className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                  >
                    View All Locations
                  </Link>
                  <Link
                    href={
                      inventorySummary?.first_inventory_item_id
                        ? `/admin/inventory/${inventorySummary.first_inventory_item_id}`
                        : "/admin/inventory"
                    }
                    className="inline-flex min-h-11 items-center justify-center bg-[#d8a344] px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062]"
                  >
                    Manage Inventory
                  </Link>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Total On Hand", inventorySummary?.total_on_hand ?? 0],
                  ["Total Reserved", inventorySummary?.total_reserved ?? 0],
                  ["Total Available", inventorySummary?.total_available ?? 0],
                  ["Total Incoming", inventorySummary?.total_incoming ?? 0],
                  ["Locations Count", inventorySummary?.locations_count ?? 0],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border border-[#f7ead2]/10 bg-[#120d08] p-4"
                  >
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#f7ead2]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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
              ["EDIBERE Creation", "collectionOdibere"],
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
                placeholder="SEO title"
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="SEO Description">
              <textarea
                value={formState.seoDescription}
                onChange={(event) =>
                  updateField("seoDescription", event.target.value)
                }
                placeholder="SEO description"
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
            {USE_SUPABASE
              ? "Reset local changes is disabled while Supabase mode is active."
              : "Local changes are saved in this browser only until database integration."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)] disabled:cursor-not-allowed disabled:bg-[#d8a344]/45 disabled:shadow-none"
            >
              {isSaving ? "Saving..." : "Save Product"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={USE_SUPABASE}
              className="inline-flex min-h-12 items-center justify-center border border-[#f7ead2]/16 px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:border-[#f7ead2]/8 disabled:text-[#e8dcc8]/32"
            >
              Reset Local Changes
            </button>
          </div>
        </SectionCard>
      </div>
      </form>

      {isMediaPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto border border-[#f7ead2]/10 bg-[#0f0b07] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.54)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
                  Media Library
                </p>
                <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                  Add Product Image
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
                className="border border-[#f7ead2]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition hover:border-[#d8a344] hover:text-[#d8a344]"
              >
                Close
              </button>
            </div>

            <input
              type="search"
              value={mediaQuery}
              onChange={(event) => setMediaQuery(event.target.value)}
              placeholder="Search uploaded and local media"
              className={`${inputClass} mt-6`}
            />

            <p className="mt-5 text-sm text-[#e8dcc8]/58">
              Showing {filteredStudioMediaAssets.length} images.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredStudioMediaAssets.map((image) => (
                <article
                  key={image.id}
                  className="overflow-hidden border border-[#f7ead2]/10 bg-[#120d08] transition duration-500 hover:-translate-y-1 hover:border-[#d8a344]/55 hover:shadow-[0_26px_80px_rgba(0,0,0,0.32),0_0_36px_rgba(216,163,68,0.1)]"
                >
                  <div className="relative aspect-square bg-[#080503]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(216,163,68,0.16),transparent_34%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
                    {image.url.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="absolute inset-0 h-full w-full object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
                      />
                    ) : (
                      <Image
                        src={image.url}
                        alt={image.filename}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-semibold text-[#f7ead2]">
                      {image.filename}
                    </p>
                    <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                      {image.category}
                    </p>
                    <p className="mt-2 truncate text-xs text-[#e8dcc8]/54">
                      {image.folder}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddGalleryMedia(image);
                      }}
                      className="mt-4 inline-flex min-h-10 w-full items-center justify-center bg-[#d8a344] px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062]"
                    >
                      Add to Product
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function EditProductForm({
  product,
  mediaAssets = [],
  productMedia = [],
  inventorySummary,
}: EditProductFormProps) {
  const override = useProductOverride(product.slug);
  const shouldClearCustomOpeleOverride =
    USE_SUPABASE && product.slug === "custom-opele" && Boolean(override);
  const effectiveOverride = shouldClearCustomOpeleOverride ? undefined : override;
  const studioProduct = mergeProductOverride(product, effectiveOverride);
  const studioKey = effectiveOverride
    ? `${product.slug}-local`
    : `${product.slug}-seed`;

  useEffect(() => {
    if (shouldClearCustomOpeleOverride) {
      resetProductOverride(product.slug);
    }
  }, [override, product.slug, shouldClearCustomOpeleOverride]);

  return (
    <ProductStudioForm
      key={studioKey}
      product={studioProduct}
      mediaAssets={mediaAssets}
      productMedia={productMedia}
      inventorySummary={inventorySummary}
      seedProduct={product}
      stock={effectiveOverride?.stock}
    />
  );
}
