"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  categories,
  collections,
  traditions,
  vendors,
} from "@/lib/catalog";
import type { ProductVendor } from "@/lib/products";
import type { MediaImage } from "@/lib/media";

type ProductCreationWizardProps = {
  mediaImages: MediaImage[];
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
  galleryNote: string;
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

const productTypesByVendor: Record<ProductVendor, string[]> = {
  "AJAKO ORIGINALS": [
    "Opele",
    "Keychain",
    "Opon",
    "Lamp",
    "Medallion",
    "Odu Tablet",
    "Sacred Art",
  ],
  "ODIBERE CREATIONS": [
    "Ide Bracelet",
    "Eleke",
    "Ide & Necklace Set",
    "Mazo",
    "Beadwork Ceremonial Tool",
  ],
};

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
  galleryNote: "",
};

const inputClass =
  "min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70";
const textareaClass =
  "w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/36 focus:border-[#d8a344]/70";

function getSkuPrefix(vendor: ProductVendor | "", productType: string) {
  const normalizedType = productType.toLowerCase();

  if (vendor === "AJAKO ORIGINALS") {
    if (normalizedType.includes("opele")) return "AJO-OPE";
    if (normalizedType.includes("keychain")) return "AJO-KEY";
    if (normalizedType.includes("opon")) return "AJO-OPN";
    if (normalizedType.includes("lamp")) return "AJO-LMP";
    if (normalizedType.includes("medallion")) return "AJO-MED";
    if (normalizedType.includes("odu")) return "AJO-ODU";
  }

  if (vendor === "ODIBERE CREATIONS") {
    if (normalizedType.includes("ide") && !normalizedType.includes("set")) {
      return "ODI-IDE";
    }
    if (normalizedType.includes("eleke")) return "ODI-ELE";
    if (normalizedType.includes("set")) return "ODI-SET";
    if (normalizedType.includes("mazo") || normalizedType.includes("tool")) {
      return "ODI-MAZ";
    }
  }

  return "ASK-NEW";
}

function getPreviewSku(state: WizardState) {
  if (!state.vendor) {
    return "Waiting for vendor...";
  }

  if (!state.productType) {
    return state.vendor === "AJAKO ORIGINALS" ? "AJO-???" : "ODI-???";
  }

  return `${getSkuPrefix(state.vendor, state.productType)}-DRAFT`;
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
  mediaImages,
}: ProductCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [message, setMessage] = useState("");
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaCategory, setMediaCategory] = useState("all");
  const [mediaFolder, setMediaFolder] = useState("all");

  const availableProductTypes = state.vendor
    ? productTypesByVendor[state.vendor]
    : [];
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
  const selectedMediaImage = mediaImages.find(
    (image) => image.url === state.mainImage,
  );
  const mediaCategories = useMemo(
    () => ["all", ...Array.from(new Set(mediaImages.map((image) => image.category)))],
    [mediaImages],
  );
  const mediaFolders = useMemo(
    () => ["all", ...Array.from(new Set(mediaImages.map((image) => image.folder)))],
    [mediaImages],
  );
  const filteredMediaImages = useMemo(() => {
    const normalizedQuery = mediaQuery.trim().toLowerCase();

    return mediaImages.filter((image) => {
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
  }, [mediaCategory, mediaFolder, mediaImages, mediaQuery]);

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
      collection:
        vendor === "AJAKO ORIGINALS" ? "AJAKO Originals" : "ODIBERE Creations",
    }));
  }

  function goToStep(stepIndex: number) {
    setCurrentStep(Math.min(Math.max(stepIndex, 0), steps.length - 1));
  }

  function handleVisualSave(action: "draft" | "publish") {
    if (action === "publish" && !canPublish) {
      setMessage("Publishing requires the missing required fields first.");
      return;
    }

    setMessage(
      action === "draft"
        ? "Draft saved locally for this session. Database persistence will connect later."
        : "Product marked ready to publish visually. Database persistence will connect later.",
    );
  }

  function selectMediaImage(image: MediaImage) {
    updateField("mainImage", image.url);
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
            Fully local wizard foundation. Save and publish actions are visual
            until database integration.
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
              {availableProductTypes.length > 0 ? (
                availableProductTypes.map((productType) => (
                  <ChoiceCard
                    key={productType}
                    title={productType}
                    description={`SKU prefix preview: ${getSkuPrefix(
                      state.vendor,
                      productType,
                    )}`}
                    selected={state.productType === productType}
                    onClick={() => updateField("productType", productType)}
                  />
                ))
              ) : (
                <p className="border border-[#f7ead2]/10 bg-[#0f0b07] p-5 text-sm text-[#e8dcc8]/64">
                  Select a vendor first to reveal dynamic product types.
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
                    alt={selectedMediaImage?.filename ?? "Selected product image"}
                    fill
                    sizes="18rem"
                    className="object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
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
                <Field label="Gallery Placeholder">
                  <textarea
                    value={state.galleryNote}
                    onChange={(event) =>
                      updateField("galleryNote", event.target.value)
                    }
                    placeholder="Gallery images will connect to Media Library in a future phase."
                    className={`${textareaClass} min-h-28`}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setIsMediaPickerOpen(true)}
                  className="inline-flex min-h-12 w-fit items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
                >
                  Choose From Media Library
                </button>
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
                    Selected Image
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
                    <div className="relative aspect-square overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
                      {state.mainImage.startsWith("/") ? (
                        <Image
                          src={state.mainImage}
                          alt={
                            selectedMediaImage?.filename ??
                            "Selected product image"
                          }
                          fill
                          sizes="12rem"
                          className="object-contain p-4"
                        />
                      ) : null}
                    </div>
                    <p className="break-words text-sm text-[#e8dcc8]/74">
                      {state.mainImage || "Pending"}
                    </p>
                  </div>
                </div>
                <ReviewItem label="Preview SKU" value={previewSku} />
                <ReviewItem label="Preview Barcode" value={previewSku} />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleVisualSave("draft")}
                  className="inline-flex min-h-12 items-center justify-center border border-[#f7ead2]/16 px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#f7ead2] transition duration-500 ease-out hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleVisualSave("publish")}
                  disabled={!canPublish}
                  className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)] disabled:cursor-not-allowed disabled:bg-[#d8a344]/35 disabled:text-[#0f0b07]/60 disabled:shadow-none"
                >
                  Publish Product
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
                  Choose Product Image
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
              Showing {filteredMediaImages.length} of {mediaImages.length} images.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMediaImages.map((image) => (
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
                      onClick={() => selectMediaImage(image)}
                      className="mt-4 inline-flex min-h-10 w-full items-center justify-center bg-[#d8a344] px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062]"
                    >
                      Select
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
