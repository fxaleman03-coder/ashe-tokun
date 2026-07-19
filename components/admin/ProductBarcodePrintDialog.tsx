"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import ProductBarcodePrintSheet from "@/components/admin/ProductBarcodePrintSheet";
import type {
  ProductBarcodeLabelKind,
  ProductBarcodeLabelProduct,
} from "@/components/admin/ProductBarcodeLabel";

type ProductBarcodePrintDialogProps = {
  products: ProductBarcodeLabelProduct[];
  canPrint: boolean;
  triggerLabel?: string;
  initialKind?: ProductBarcodeLabelKind;
  forceKind?: ProductBarcodeLabelKind;
  className?: string;
};

const labelKinds: ProductBarcodeLabelKind[] = [
  "SHELF",
  "PRODUCT",
  "MINI_PRODUCT",
];

function getKindLabel(kind: ProductBarcodeLabelKind, labels: {
  shelfLabel: string;
  productLabel: string;
  miniProductLabel: string;
}) {
  if (kind === "SHELF") return labels.shelfLabel;
  if (kind === "PRODUCT") return labels.productLabel;

  return labels.miniProductLabel;
}

export default function ProductBarcodePrintDialog({
  products,
  canPrint,
  triggerLabel,
  initialKind = "PRODUCT",
  forceKind,
  className,
}: ProductBarcodePrintDialogProps) {
  const { t } = useLanguage();
  const labels = t.admin.productIdentification;
  const [isOpen, setIsOpen] = useState(false);
  const [kind, setKind] = useState<ProductBarcodeLabelKind>(
    forceKind ?? initialKind,
  );
  const [copies, setCopies] = useState("1");
  const parsedCopies = Number(copies);
  const isCopiesValid = Number.isInteger(parsedCopies) && parsedCopies > 0;
  const selectedKind = forceKind ?? kind;
  const items = products.map((product) => ({
    product,
    quantity: isCopiesValid ? parsedCopies : 1,
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={products.length === 0}
        className={
          className ??
          "inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:cursor-not-allowed disabled:opacity-40"
        }
      >
        {triggerLabel ?? labels.printLabels}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#050302]/88 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={labels.printLabels}
        >
          <div className="mx-auto max-w-5xl border border-[#f7ead2]/12 bg-[#0f0b07] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
            <div className="no-print flex flex-wrap items-start justify-between gap-4 border-b border-[#f7ead2]/10 pb-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                  {labels.printLabels}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-[#f7ead2]">
                  {labels.preview}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e8dcc8]/62">
                  {labels.previewDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/45 hover:text-[#d8a344]"
              >
                {labels.cancel}
              </button>
            </div>

            <div className="no-print mt-5 grid gap-4 md:grid-cols-[1fr_12rem]">
              {forceKind ? (
                <div className="border border-[#f7ead2]/10 bg-[#120d08] p-4">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                    {labels.labelType}
                  </p>
                  <p className="mt-2 text-sm text-[#f7ead2]">
                    {getKindLabel(forceKind, labels)}
                  </p>
                </div>
              ) : (
                <fieldset className="grid gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-4">
                  <legend className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                    {labels.labelType}
                  </legend>
                  {labelKinds.map((labelKind) => (
                    <label
                      key={labelKind}
                      className="flex items-center gap-3 text-sm text-[#e8dcc8]/74"
                    >
                      <input
                        type="radio"
                        name="barcode-label-kind"
                        value={labelKind}
                        checked={kind === labelKind}
                        onChange={() => setKind(labelKind)}
                        className="accent-[#d8a344]"
                      />
                      {getKindLabel(labelKind, labels)}
                    </label>
                  ))}
                </fieldset>
              )}

              <label className="block border border-[#f7ead2]/10 bg-[#120d08] p-4">
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                  {labels.copiesPerProduct}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={copies}
                  onChange={(event) => setCopies(event.target.value)}
                  className="mt-3 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70"
                />
              </label>
            </div>

            <div className="mt-5">
              <ProductBarcodePrintSheet
                items={items}
                kind={selectedKind}
                canPrint={canPrint && isCopiesValid}
              />
            </div>

            {!canPrint ? (
              <p className="no-print mt-4 border border-[#d8a344]/25 bg-[#120d08] px-4 py-3 text-sm text-[#e8dcc8]/72">
                {labels.printPermissionRequired}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
