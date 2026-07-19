"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import ProductBarcodeLabel, {
  type ProductBarcodeLabelKind,
  type ProductBarcodeLabelProduct,
} from "@/components/admin/ProductBarcodeLabel";
import { recordProductBarcodePrints } from "@/lib/data/productMutations";

type ProductBarcodePrintSheetItem = {
  product: ProductBarcodeLabelProduct;
  quantity: number;
};

type ProductBarcodePrintSheetProps = {
  items: ProductBarcodePrintSheetItem[];
  kind: ProductBarcodeLabelKind;
  canPrint: boolean;
};

export default function ProductBarcodePrintSheet({
  items,
  kind,
  canPrint,
}: ProductBarcodePrintSheetProps) {
  const { t } = useLanguage();
  const labels = t.admin.productIdentification;
  const [message, setMessage] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const printableItems = useMemo(
    () =>
      items.flatMap((item) =>
        Array.from({ length: item.quantity }, (_, index) => ({
          product: item.product,
          key: `${item.product.id}-${index}`,
        })),
      ),
    [items],
  );

  async function printLabels() {
    if (!canPrint) {
      setMessage(labels.printPermissionRequired);
      return;
    }

    setIsPrinting(true);
    setMessage(labels.recordingPrint);

    const result = await recordProductBarcodePrints(
      items.map((item) => ({
        productId: item.product.id,
        labelCount: item.quantity,
      })),
    );

    if (!result.ok) {
      setIsPrinting(false);
      setMessage(`${labels.printFailed}: ${result.error}`);
      return;
    }

    setMessage(labels.printReady);
    window.requestAnimationFrame(() => {
      window.print();
      setIsPrinting(false);
    });
  }

  return (
    <section className="space-y-4">
      <div className="product-barcode-print-controls no-print flex flex-wrap items-center justify-between gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-4">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            {labels.printLabels}
          </p>
          <p className="mt-2 text-sm text-[#e8dcc8]/62">
            {labels.internalNotice}
          </p>
        </div>
        <button
          type="button"
          onClick={printLabels}
          disabled={!canPrint || isPrinting || printableItems.length === 0}
          className="inline-flex min-h-11 items-center justify-center bg-[#d8a344] px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 hover:bg-[#f0c062] disabled:cursor-not-allowed disabled:bg-[#d8a344]/30 disabled:text-[#0f0b07]/50"
        >
          {isPrinting ? labels.printing : labels.printLabels}
        </button>
      </div>

      {message ? (
        <p className="no-print border border-[#d8a344]/25 bg-[#0f0b07] px-4 py-3 text-sm text-[#e8dcc8]/72">
          {message}
        </p>
      ) : null}

      <div className="product-barcode-print-root">
        {printableItems.map((item) => (
          <ProductBarcodeLabel
            key={item.key}
            product={item.product}
            kind={kind}
          />
        ))}
      </div>
    </section>
  );
}
