"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { collections, traditions, vendors } from "@/lib/catalog";
import type { Category } from "@/lib/data/localCategories";
import type { ProductType } from "@/lib/data/localProductTypes";
import { createProduct } from "@/lib/data/productMutations";
import {
  addProductMedia,
  setPrimaryProductMedia,
} from "@/lib/data/productMediaMutations";
import type { MediaAsset } from "@/lib/data/mediaRepository";
import type { ProductVendor } from "@/lib/products";

type ProductCreationWizardProps = {
  mediaAssets: MediaAsset[];
  categories: Category[];
  productTypes: ProductType[];
};

type WizardState = {
  vendor: ProductVendor | "";
  productType: string;
  name: string;
  shortDescription: string;
  collection: string;
  category: string;
  tradition: string;
  cost: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  availableOnline: boolean;
  availableInStore: boolean;
  mainImage: string;
};

const steps = [
  "Vendor",
  "Product Type",
  "Product Identity",
  "Pricing",
  "Availability",
  "Media",
  "Review",
];

const initialState: WizardState = {
  vendor: "",
  productType: "",
  name: "",
  shortDescription: "",
  collection: "",
  category: "",
  tradition: "",
  cost: "",
  price: "",
  compareAtPrice: "",
  stock: "",
  availableOnline: true,
  availableInStore: true,
  mainImage: "",
};

const inputClass =
  "min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70";
const textareaClass =
  "w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70";

function getSkuPrefix(vendor: ProductVendor | "", category: string) {
  const normalizedCategory = category.toLowerCase();

  if (vendor === "AJAKO ORIGINALS") {
    if (normalizedCategory.includes("opele")) return "AJO-OPE";
    if (normalizedCategory.includes("keychain")) return "AJO-KEY";
    if (normalizedCategory.includes("opon")) return "AJO-OPN";
    if (normalizedCategory.includes("lamp")) return "AJO-LMP";
    if (normalizedCategory.includes("medallion")) return "AJO-MED";
    if (normalizedCategory.includes("odu")) return "AJO-ODU";
  }

  if (vendor === "ODIBERE CREATIONS") {
    if (normalizedCategory.includes("ide") && !normalizedCategory.includes("set")) {
      return "ODI-IDE";
    }
    if (normalizedCategory.includes("eleke")) return "ODI-ELE";
    if (normalizedCategory.includes("set")) return "ODI-SET";
    if (normalizedCategory.includes("mazo") || normalizedCategory.includes("tool")) {
      return "ODI-MAZ";
    }
  }

  return "ASK-NEW";
}

function getPreviewSku(state: WizardState) {
  if (!state.vendor) {
    return "Waiting for vendor...";
  }

  if (!state.category) {
    return state.vendor === "AJAKO ORIGINALS" ? "AJO-???" : "ODI-???";
  }

  return `${getSkuPrefix(state.vendor, state.category)}-DRAFT`;
}

function getEstimatedMargin(cost: string, price: string) {
  const parsedCost = Number(cost);
  const parsedPrice = Number(price);

  if (
    !Number.isFinite(parsedCost) ||
    !Number.isFinite(parsedPrice) ||
    parsedPrice <= 0
  ) {
    return "Estimated Margin";
  }

  return `${(((parsedPrice - parsedCost) / parsedPrice) * 100).toFixed(1)}%`;
}

function getInventoryStatus(stock: string) {
  return stock.trim() === "" ? "Inventory not configured" : "Ready to track";
}

function parseRequiredPrice(value: string) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parseOptionalPrice(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function getMissingRequiredFields(state: WizardState) {
  return [
    ["Vendor", state.vendor],
    ["Product Type", state.productType],
    ["Product Name", state.name],
    ["Price", state.price],
  ]
    .filter(([, value]) => String(value).trim() === "")
    .map(([label]) => label);
}

function getMissingRecommendedFields(state: WizardState) {
  return [
    ["Main Image", state.mainImage],
    ["Category", state.category],
    ["Collection", state.collection],
    ["Tradition", state.tradition],
    ["Initial Stock", state.stock],
  ]
    .filter(([, value]) => String(value).trim() === "")
    .map(([label]) => label);
}

function Field({
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

function ChoiceCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-32 border p-5 text-left transition duration-500 ease-out ${
        selected
          ? "border-[#d8a344]/70 bg-[#d8a344]/10 shadow-[0_0_34px_rgba(216,163,68,0.13)]"
          : "border-[#f7ead2]/10 bg-[#0f0b07] hover:border-[#d8a344]/45"
      }`}
    >
      <span className="block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
        {title}
      </span>
      <span className="mt-3 block text-sm leading-6 text-[#e8dcc8]/64">
        {description}
      </span>
    </button>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-[#e8dcc8]/74">
        {value || "Pending"}
      </p>
    </div>
  );
}

export default function ProductCreationWizard({
  mediaAssets,
  categories,
  productTypes,
}: ProductCreationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaCategory, setMediaCategory] = useState("all");
  const [mediaFolder, setMediaFolder] = useState("all");
  const [mediaPickerPurpose, setMediaPickerPurpose] = useState<
    "primary" | "gallery"
  >("primary");
  const [selectedGalleryAssets, setSelectedGalleryAssets] = useState<
    MediaAsset[]
  >([]);

  const databaseProductTypes = useMemo(
    () =>
      productTypes.filter((productType) =>
        ["Physical Product", "Handmade Product", "Made to Order"].includes(
          productType.name,
        ),
      ),
    [productTypes],
  );
  const previewSku = useMemo(() => getPreviewSku(state), [state]);
  const missingRequiredFields = useMemo(
    () => getMissingRequiredFields(state),
    [state],
  );
  const missingRecommendedFields = useMemo(
    () => getMissingRecommendedFields(state),
    [state],
  );
  const canPublish = missingRequiredFields.length === 0;
  const selectedMediaAsset = mediaAssets.find(
    (image) => image.url === state.mainImage,
  );
  const mediaCategories = useMemo(
    () => ["all", ...Array.from(new Set(mediaAssets.map((image) => image.category)))],
    [mediaAssets],
  );
  const mediaFolders = useMemo(
    () => ["all", ...Array.from(new Set(mediaAssets.map((image) => image.folder)))],
    [mediaAssets],
  );
  const filteredMediaAssets = useMemo(() => {
    const normalizedQuery = mediaQuery.trim().toLowerCase();

    return mediaAssets.filter((image) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        image.filename.toLowerCase().includes(normalizedQuery) ||
        image.folder.toLowerCase().includes(normalizedQuery) ||
        image.category.toLowerCase().includes(normalizedQuery);
      const matchesCategory =
        mediaCategory === "all" || image.category === mediaCategory;
      const matchesFolder = mediaFolder === "all" || image.folder === mediaFolder;

      return matchesQuery && matchesCategory && matchesFolder;
    });
  }, [mediaAssets, mediaCategory, mediaFolder, mediaQuery]);

  function updateField<FieldName extends keyof WizardState>(
    field: FieldName,
    value: WizardState[FieldName],
  ) {
    setMessage("");
    setState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  }

  function selectVendor(vendor: ProductVendor) {
    setState((currentState) => ({
      ...currentState,
      vendor,
      productType: "",
      category: "",
      collection:
        vendor === "AJAKO ORIGINALS" ? "AJAKO Originals" : "ODIBERE Creations",
    }));
  }

  function goToStep(stepIndex: number) {
    setCurrentStep(Math.min(Math.max(stepIndex, 0), steps.length - 1));
  }

  function openMediaPicker(purpose: "primary" | "gallery") {
    setMediaPickerPurpose(purpose);
    setIsMediaPickerOpen(true);
  }

  function moveGalleryAsset(assetIndex: number, direction: -1 | 1) {
    const nextIndex = assetIndex + direction;

    if (nextIndex < 0 || nextIndex >= selectedGalleryAssets.length) {
      return;
    }

    setSelectedGalleryAssets((currentAssets) => {
      const nextAssets = [...currentAssets];
      const [movedAsset] = nextAssets.splice(assetIndex, 1);
      nextAssets.splice(nextIndex, 0, movedAsset);
      return nextAssets;
    });
  }

  function removeGalleryAsset(assetId: string) {
    setSelectedGalleryAssets((currentAssets) =>
      currentAssets.filter((asset) => asset.id !== assetId),
    );
  }

  async function handleCreateProduct(action: "draft" | "publish") {
    if (action === "publish" && !canPublish) {
      setMessage("Publishing requires the missing required fields first.");
      return;
    }

    const price = parseRequiredPrice(state.price);
    const compareAtPrice = parseOptionalPrice(state.compareAtPrice);
    const cost = parseOptionalPrice(state.cost);

    if (price === undefined || price < 0) {
      setMessage("Creation failed: Price must be a valid non-negative number.");
      return;
    }

    if (compareAtPrice === undefined || cost === undefined) {
      setMessage(
        "Creation failed: Compare at price and cost must be valid non-negative numbers when provided.",
      );
      return;
    }

    setIsCreating(true);
    setMessage("Creating...");

    const result = await createProduct({
      vendor: state.vendor,
      category: state.category,
      tradition: state.tradition,
      productType: state.productType,
      name: state.name,
      shortDescription: state.shortDescription,
      description: state.shortDescription,
      sku: previewSku,
      barcode: previewSku,
      price,
      compareAtPrice,
      cost,
      featured: false,
      newArrival: action === "publish",
      availableOnline: state.availableOnline,
      availableInStore: state.availableInStore,
      action,
    });

    setIsCreating(false);

    if (!result.ok) {
      setMessage(`Creation failed: ${result.error}`);
      return;
    }

    if (result.source === "local") {
      setMessage(
        action === "draft"
          ? "Draft saved locally for this session."
          : "Product published locally for this session.",
      );
      return;
    }

    const createdSlug = result.product.slug;

    if (!createdSlug) {
      setMessage("Creation failed: Supabase did not return a product slug.");
      return;
    }

    let linkedCount = 0;
    let failedCount = 0;

    if (selectedMediaAsset) {
      const createdProductId = result.product.id;

      if (!createdProductId || selectedMediaAsset.source !== "supabase") {
        setMessage("Product created, but image linking failed.");
        return;
      }

      const mediaResult = await setPrimaryProductMedia(
        createdProductId,
        selectedMediaAsset.id,
      );

      if (!mediaResult.ok) {
        setMessage("Product created, but image linking failed.");
        return;
      }

      linkedCount += 1;
    }

    if (selectedGalleryAssets.length > 0) {
      const createdProductId = result.product.id;

      if (!createdProductId) {
        setMessage("Product created, but gallery image linking failed.");
        return;
      }

      for (const asset of selectedGalleryAssets) {
        if (asset.source !== "supabase") {
          failedCount += 1;
          continue;
        }

        const mediaResult = await addProductMedia(createdProductId, asset.id);

        if (mediaResult.ok) {
          linkedCount += 1;
        } else {
          failedCount += 1;
        }
      }
    }

    if (failedCount > 0) {
      setMessage(
        `Product created, but image linking partially failed. ${linkedCount} linked, ${failedCount} failed.`,
      );
      router.refresh();
      router.push(`/admin/products/${createdSlug}/edit`);
      return;
    }

    setMessage(
      action === "draft"
        ? "Draft saved to Supabase."
        : "Product published to Supabase.",
    );
    router.refresh();
    router.push(`/admin/products/${createdSlug}/edit`);
  }

  function selectMediaAsset(asset: MediaAsset) {
    if (mediaPickerPurpose === "primary") {
      updateField("mainImage", asset.url);
      setSelectedGalleryAssets((currentAssets) =>
        currentAssets.filter((currentAsset) => currentAsset.id !== asset.id),
      );
      setIsMediaPickerOpen(false);
      return;
    }

    if (selectedMediaAsset?.id === asset.id) {
      setMessage("This asset is already selected as the primary image.");
      setIsMediaPickerOpen(false);
      return;
    }

    setSelectedGalleryAssets((currentAssets) => {
      if (currentAssets.some((currentAsset) => currentAsset.id === asset.id)) {
        return currentAssets;
      }

      return [...currentAssets, asset];
    });
    setIsMediaPickerOpen(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] xl:sticky xl:top-6 xl:self-start">
        <p className="text-[0.66rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
          Product Wizard
        </p>
        <div className="mt-5 space-y-2">
          {steps.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => goToStep(index)}
              className={`flex min-h-11 w-full items-center gap-3 border px-3 text-left text-[0.68rem] font-bold uppercase tracking-[0.14em] transition duration-300 ${
                currentStep === index
                  ? "border-[#d8a344]/70 text-[#d8a344]"
                  : "border-[#f7ead2]/10 text-[#e8dcc8]/58 hover:border-[#d8a344]/45 hover:text-[#d8a344]"
              }`}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 border border-[#d8a344]/20 bg-[#0f0b07] p-4">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Preview SKU
          </p>
          <p className="mt-2 font-mono text-sm text-[#f7ead2]">{previewSku}</p>
        </div>
      </aside>

      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
              Step {currentStep + 1} of {steps.length}
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
              {steps[currentStep]}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#e8dcc8]/58">
            Product creation writes to Supabase when enabled, with local visual
            fallback available for development.
          </p>
        </div>

        {message ? (
          <p className="mt-6 border border-[#d8a344]/35 bg-[#d8a344]/10 px-5 py-4 text-sm font-medium text-[#f7ead2]">
            {message}
          </p>
        ) : null}

        <div className="mt-8">
          {currentStep === 0 ? (
            <div>
              <p className="mb-5 text-sm leading-6 text-[#e8dcc8]/62">
                Select the maker or brand responsible for this product.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {vendors.map((vendor) => (
                  <ChoiceCard
                    key={vendor.id}
                    title={vendor.name}
                    description={
                      vendor.name === "AJAKO ORIGINALS"
                        ? "In-house handcrafted spiritual goods."
                        : "Traditional handcrafted beadwork."
                    }
                    selected={state.vendor === vendor.name}
                    onClick={() => selectVendor(vendor.name as ProductVendor)}
                  />
                ))}
                <ChoiceCard
                  title="Create Vendor"
                  description="Future vendor creation placeholder."
                  selected={false}
                  onClick={() =>
                    setMessage("Create Vendor will connect in a future phase.")
                  }
                />
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {databaseProductTypes.length > 0 ? (
                databaseProductTypes.map((productType) => (
                  <ChoiceCard
                    key={productType.id}
                    title={productType.name}
                    description={
                      productType.description ??
                      "Commerce handling type for this product."
                    }
                    selected={state.productType === productType.name}
                    onClick={() => updateField("productType", productType.name)}
                  />
                ))
              ) : (
                <p className="border border-[#f7ead2]/10 bg-[#0f0b07] p-5 text-sm text-[#e8dcc8]/64">
                  Product types will load from the catalog foundation.
                </p>
              )}
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Name">
                <input
                  value={state.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Collection">
                <select
                  value={state.collection}
                  onChange={(event) =>
                    updateField("collection", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select collection</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.name}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <select
                  value={state.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tradition">
                <select
                  value={state.tradition}
                  onChange={(event) =>
                    updateField("tradition", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select tradition</option>
                  {traditions.map((tradition) => (
                    <option key={tradition.id} value={tradition.name}>
                      {tradition.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Short Description">
                  <textarea
                    value={state.shortDescription}
                    onChange={(event) =>
                      updateField("shortDescription", event.target.value)
                    }
                    className={`${textareaClass} min-h-32`}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Cost">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.cost}
                  onChange={(event) => updateField("cost", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Compare At Price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.compareAtPrice}
                  onChange={(event) =>
                    updateField("compareAtPrice", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <div className="border border-[#d8a344]/20 bg-[#0f0b07] p-4">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                  Estimated Margin
                </p>
                <p className="mt-3 text-lg font-semibold text-[#f7ead2]">
                  {getEstimatedMargin(state.cost, state.price)}
                </p>
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="grid gap-5">
              <p className="border border-[#d8a344]/20 bg-[#0f0b07] px-5 py-4 text-sm leading-6 text-[#e8dcc8]/70">
                Detailed inventory location, reorder levels, and stock controls
                are managed later from the Inventory module.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Initial Stock / Quantity">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={state.stock}
                    onChange={(event) =>
                      updateField("stock", event.target.value)
                    }
                    placeholder="Optional"
                    className={inputClass}
                  />
                </Field>
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
                      checked={state[field as keyof WizardState] as boolean}
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
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div className="relative aspect-square overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(216,163,68,0.18),transparent_32%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
                {state.mainImage.startsWith("/") ? (
                  <Image
                    src={state.mainImage}
                    alt={selectedMediaAsset?.filename ?? "Selected product image"}
                    fill
                    sizes="18rem"
                    className="object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
                  />
                ) : state.mainImage.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.mainImage}
                    alt={selectedMediaAsset?.filename ?? "Selected product image"}
                    className="absolute inset-0 h-full w-full object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
                  />
                ) : (
                  <div className="absolute inset-6 flex items-center justify-center border border-[#f7ead2]/8 text-center text-xs uppercase tracking-[0.2em] text-[#e8dcc8]/38">
                    Current selected image preview
                  </div>
                )}
              </div>
              <div className="grid gap-5">
                <Field label="Image Path">
                  <input
                    value={state.mainImage}
                    onChange={(event) =>
                      updateField("mainImage", event.target.value)
                    }
                    placeholder="/products/..."
                    className={inputClass}
                  />
                </Field>
                <p className="text-sm leading-6 text-[#e8dcc8]/58">
                  Uploaded assets are stored in Supabase. Selecting one asset
                  as primary and optional gallery assets will create product
                  media links after the product is created.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openMediaPicker("primary")}
                    className="inline-flex min-h-12 w-fit items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
                  >
                    Select Primary Image
                  </button>
                  <button
                    type="button"
                    onClick={() => openMediaPicker("gallery")}
                    className="inline-flex min-h-12 w-fit items-center justify-center border border-[#f7ead2]/16 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                  >
                    Add Gallery Images
                  </button>
                </div>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                    Gallery Images
                  </p>
                  {selectedGalleryAssets.length > 0 ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedGalleryAssets.map((asset, index) => (
                        <article
                          key={asset.id}
                          className="border border-[#f7ead2]/10 bg-[#0f0b07] p-3"
                        >
                          <div className="relative aspect-square overflow-hidden bg-[#080503]">
                            {asset.url.startsWith("http") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={asset.url}
                                alt={asset.filename}
                                className="absolute inset-0 h-full w-full object-contain p-4"
                              />
                            ) : (
                              <Image
                                src={asset.url}
                                alt={asset.filename}
                                fill
                                sizes="12rem"
                                className="object-contain p-4"
                              />
                            )}
                          </div>
                          <p className="mt-3 truncate text-sm font-semibold text-[#f7ead2]">
                            {asset.filename}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => moveGalleryAsset(index, -1)}
                              disabled={index === 0}
                              className="min-h-9 border border-[#f7ead2]/14 px-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#e8dcc8]/70 disabled:opacity-30"
                            >
                              Left
                            </button>
                            <button
                              type="button"
                              onClick={() => moveGalleryAsset(index, 1)}
                              disabled={index === selectedGalleryAssets.length - 1}
                              className="min-h-9 border border-[#f7ead2]/14 px-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#e8dcc8]/70 disabled:opacity-30"
                            >
                              Right
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGalleryAsset(asset.id)}
                              className="min-h-9 border border-[#d8a344]/35 px-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#d8a344]"
                            >
                              Remove
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/58">
                      No gallery images selected yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 6 ? (
            <div>
              <div className="mb-6 grid gap-4 lg:grid-cols-2">
                {missingRequiredFields.length > 0 ? (
                  <section className="border border-[#d8a344]/35 bg-[#d8a344]/10 p-5">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                      Missing Required Information
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-[#f7ead2]">
                      {missingRequiredFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="border border-[#f7ead2]/10 bg-[#0f0b07] p-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                    Recommended Before Publishing
                  </p>
                  {missingRecommendedFields.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-[#e8dcc8]/72">
                      {missingRecommendedFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-[#e8dcc8]/72">
                      All recommended fields are complete.
                    </p>
                  )}
                </section>
              </div>

              <p className="mb-6 border border-[#d8a344]/20 bg-[#0f0b07] px-5 py-4 text-sm leading-6 text-[#e8dcc8]/70">
                Drafts can be saved with incomplete information. Publishing
                requires the required fields above.
              </p>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ReviewItem label="Vendor" value={state.vendor} />
                <ReviewItem label="Product Type" value={state.productType} />
                <ReviewItem label="Name" value={state.name} />
                <ReviewItem label="Collection" value={state.collection} />
                <ReviewItem label="Category" value={state.category} />
                <ReviewItem label="Tradition" value={state.tradition} />
                <ReviewItem label="Cost" value={state.cost} />
                <ReviewItem label="Price" value={state.price} />
                <ReviewItem label="Compare At" value={state.compareAtPrice} />
                <ReviewItem
                  label="Initial Stock / Quantity"
                  value={state.stock}
                />
                <ReviewItem
                  label="Inventory Status"
                  value={getInventoryStatus(state.stock)}
                />
                <div className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 md:col-span-2 xl:col-span-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                    Primary Image
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
                    <div className="relative aspect-square overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
                      {state.mainImage.startsWith("/") ? (
                        <Image
                          src={state.mainImage}
                          alt={
                            selectedMediaAsset?.filename ??
                            "Selected product image"
                          }
                          fill
                          sizes="12rem"
                          className="object-contain p-4"
                        />
                      ) : state.mainImage.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={state.mainImage}
                          alt={
                            selectedMediaAsset?.filename ??
                            "Selected product image"
                          }
                          className="absolute inset-0 h-full w-full object-contain p-4"
                        />
                      ) : null}
                    </div>
                    <p className="break-words text-sm text-[#e8dcc8]/74">
                      {state.mainImage || "Pending"}
                    </p>
                  </div>
                </div>
                <div className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 md:col-span-2 xl:col-span-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                    Gallery Images
                  </p>
                  <p className="mt-3 text-sm text-[#e8dcc8]/70">
                    {selectedGalleryAssets.length} selected
                  </p>
                  {selectedGalleryAssets.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                      {selectedGalleryAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="relative aspect-square overflow-hidden border border-[#f7ead2]/10 bg-[#080503]"
                        >
                          {asset.url.startsWith("http") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={asset.url}
                              alt={asset.filename}
                              className="absolute inset-0 h-full w-full object-contain p-3"
                            />
                          ) : (
                            <Image
                              src={asset.url}
                              alt={asset.filename}
                              fill
                              sizes="9rem"
                              className="object-contain p-3"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <ReviewItem label="Preview SKU" value={previewSku} />
                <ReviewItem label="Preview Barcode" value={previewSku} />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleCreateProduct("draft")}
                  disabled={isCreating}
                  className="inline-flex min-h-12 items-center justify-center border border-[#f7ead2]/16 px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {isCreating ? "Creating..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateProduct("publish")}
                  disabled={!canPublish || isCreating}
                  className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)] disabled:cursor-not-allowed disabled:bg-[#d8a344]/35 disabled:text-[#0f0b07]/60 disabled:shadow-none"
                >
                  {isCreating ? "Creating..." : "Publish Product"}
                </button>
                <Link
                  href="/admin/products"
                  className="inline-flex min-h-12 items-center justify-center border border-[#f7ead2]/16 px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                >
                  Cancel
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#f7ead2]/10 pt-6">
          <button
            type="button"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/16 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Previous
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => goToStep(currentStep + 1)}
              className="inline-flex min-h-11 items-center justify-center bg-[#d8a344] px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)]"
            >
              Next
            </button>
          ) : null}
        </div>
      </section>

      {isMediaPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto border border-[#f7ead2]/10 bg-[#0f0b07] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.54)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
                  Media Library
                </p>
                <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                  {mediaPickerPurpose === "primary"
                    ? "Choose Primary Image"
                    : "Choose Gallery Image"}
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

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_14rem_14rem]">
              <input
                type="search"
                value={mediaQuery}
                onChange={(event) => setMediaQuery(event.target.value)}
                placeholder="Search images"
                className={inputClass}
              />
              <select
                value={mediaCategory}
                onChange={(event) => setMediaCategory(event.target.value)}
                className={inputClass}
              >
                {mediaCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "Category" : category}
                  </option>
                ))}
              </select>
              <select
                value={mediaFolder}
                onChange={(event) => setMediaFolder(event.target.value)}
                className={inputClass}
              >
                {mediaFolders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder === "all" ? "Folder" : folder}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-5 text-sm text-[#e8dcc8]/58">
              Showing {filteredMediaAssets.length} of {mediaAssets.length} images.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMediaAssets.map((image) => (
                <article
                  key={image.id}
                  className="overflow-hidden border border-[#f7ead2]/10 bg-[#120d08] transition duration-500 hover:-translate-y-1 hover:border-[#d8a344]/55 hover:shadow-[0_26px_80px_rgba(0,0,0,0.32),0_0_36px_rgba(216,163,68,0.1)]"
                >
                  <div className="relative aspect-square bg-[#080503]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(216,163,68,0.16),transparent_34%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
                    <Image
                      src={image.url}
                      alt={image.filename}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
                    />
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
                      onClick={() => selectMediaAsset(image)}
                      className="mt-4 inline-flex min-h-10 w-full items-center justify-center bg-[#d8a344] px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062]"
                    >
                      {mediaPickerPurpose === "primary"
                        ? "Select Primary"
                        : "Add to Gallery"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
