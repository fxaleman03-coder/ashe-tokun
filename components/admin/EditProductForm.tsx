"use client";

import { useMemo, useState } from "react";
import { productVendors, type Product, type ProductVendor } from "@/lib/products";
import {
  getProductOverride,
  mergeProductOverride,
  resetProductOverride,
  saveProductOverride,
} from "@/lib/productStore";

type EditProductFormProps = {
  product: Product;
};

type EditProductFormState = {
  vendor: ProductVendor;
  name: string;
  category: string;
  tradition: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  image: string;
  isFeatured: boolean;
  isNew: boolean;
  shortDescription: string;
};

function formatInputPrice(price?: number) {
  return typeof price === "number" ? price.toFixed(2) : "";
}

function getDefaultStock(product: Product) {
  return product.inStock ? "12" : "0";
}

function toFormState(product: Product, stock?: number): EditProductFormState {
  return {
    vendor: product.vendor,
    name: product.name.en,
    category: product.category.en,
    tradition: product.tradition.en,
    price: formatInputPrice(product.price),
    compareAtPrice: formatInputPrice(product.compareAtPrice),
    stock: typeof stock === "number" ? String(stock) : getDefaultStock(product),
    image: product.image ?? "",
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    shortDescription: product.shortDescription.en,
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

export default function EditProductForm({ product }: EditProductFormProps) {
  const seedFormState = useMemo(() => toFormState(product), [product]);
  const [formState, setFormState] = useState(() => {
    const override = getProductOverride(product.slug);
    return toFormState(mergeProductOverride(product, override), override?.stock);
  });
  const [message, setMessage] = useState("");

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
      name: formState.name.trim() || product.name.en,
      vendor: formState.vendor,
      category: formState.category.trim() || product.category.en,
      tradition: formState.tradition.trim() || product.tradition.en,
      price: Number.isFinite(parsedPrice) ? parsedPrice : product.price,
      compareAtPrice: parseOptionalPrice(formState.compareAtPrice),
      stock: Number.isFinite(parsedStock) ? parsedStock : 0,
      image: formState.image.trim() || null,
      isFeatured: formState.isFeatured,
      isNew: formState.isNew,
      shortDescription:
        formState.shortDescription.trim() || product.shortDescription.en,
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
      className="max-w-5xl border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-8"
    >
      <p className="mb-8 border border-[#d8a344]/20 bg-[#0f0b07] px-5 py-4 text-sm leading-6 text-[#e8dcc8]/70">
        Local changes are saved in this browser only until database integration.
      </p>

      {message ? (
        <p className="mb-8 border border-[#d8a344]/35 bg-[#d8a344]/10 px-5 py-4 text-sm font-medium text-[#f7ead2]">
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Product Name
          </span>
          <input
            type="text"
            value={formState.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
          />
        </label>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            SKU
          </span>
          <input
            type="text"
            value={`SKU-${product.id.replace("prod-", "").toUpperCase()}`}
            readOnly
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2]/58 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Vendor
          </span>
          <select
            value={formState.vendor}
            onChange={(event) =>
              updateField("vendor", event.target.value as ProductVendor)
            }
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
          >
            {productVendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Category
          </span>
          <input
            type="text"
            value={formState.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
          />
        </label>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Tradition
          </span>
          <input
            type="text"
            value={formState.tradition}
            onChange={(event) => updateField("tradition", event.target.value)}
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
          />
        </label>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Price
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.price}
            onChange={(event) => updateField("price", event.target.value)}
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
          />
        </label>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Compare At Price
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.compareAtPrice}
            onChange={(event) =>
              updateField("compareAtPrice", event.target.value)
            }
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
          />
        </label>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Stock
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={formState.stock}
            onChange={(event) => updateField("stock", event.target.value)}
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
          />
        </label>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Image Path
          </span>
          <input
            type="text"
            value={formState.image}
            onChange={(event) => updateField("image", event.target.value)}
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
          />
        </label>
      </div>

      <label className="mt-5 block">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
          Description
        </span>
        <textarea
          value={formState.shortDescription}
          onChange={(event) =>
            updateField("shortDescription", event.target.value)
          }
          className="mt-3 min-h-36 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-3 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
        />
      </label>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-4 text-sm font-medium text-[#e8dcc8]/78">
          <input
            type="checkbox"
            checked={formState.isFeatured}
            onChange={(event) =>
              updateField("isFeatured", event.target.checked)
            }
            className="h-4 w-4 accent-[#d8a344]"
          />
          Featured
        </label>
        <label className="flex items-center gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-4 text-sm font-medium text-[#e8dcc8]/78">
          <input
            type="checkbox"
            checked={formState.isNew}
            onChange={(event) => updateField("isNew", event.target.checked)}
            className="h-4 w-4 accent-[#d8a344]"
          />
          New Arrival
        </label>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
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
    </form>
  );
}
