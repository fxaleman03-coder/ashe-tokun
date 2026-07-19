"use client";

import { useLanguage } from "@/components/LanguageProvider";
import ProductBarcodeLabel, {
  type ProductBarcodeLabelProduct,
} from "@/components/admin/ProductBarcodeLabel";
import ProductBarcodePrintDialog from "@/components/admin/ProductBarcodePrintDialog";

type ProductIdentificationPanelProps = {
  product: ProductBarcodeLabelProduct;
  canPrint: boolean;
};

export default function ProductIdentificationPanel({
  product,
  canPrint,
}: ProductIdentificationPanelProps) {
  const { t } = useLanguage();
  const labels = t.admin.productIdentification;

  return (
    <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <p className="text-[0.66rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
        {labels.productIdentification}
      </p>
      <h2 className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
        {labels.internalBarcode}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/64">
        {labels.notUpcEanGtin}
      </p>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {labels.code128Preview}
            </p>
            <div className="mt-3 max-w-sm">
              <ProductBarcodeLabel product={product} kind="PRODUCT" />
            </div>
          </div>
          <label className="block">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {labels.barcodeValue}
            </span>
            <input
              type="text"
              value={product.barcodeValue}
              readOnly
              className="mt-3 min-h-12 w-full cursor-not-allowed border border-[#f7ead2]/10 bg-[#0f0b07] px-4 font-mono text-sm text-[#e8dcc8]/70 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {labels.sku}
            </span>
            <input
              type="text"
              value={product.sku}
              readOnly
              className="mt-3 min-h-12 w-full cursor-not-allowed border border-[#f7ead2]/10 bg-[#0f0b07] px-4 font-mono text-sm text-[#e8dcc8]/70 outline-none"
            />
          </label>
        </div>

        <div className="grid content-start gap-3">
          <ProductBarcodePrintDialog
            products={[product]}
            canPrint={canPrint}
            forceKind="SHELF"
            triggerLabel={labels.printShelfLabel}
          />
          <ProductBarcodePrintDialog
            products={[product]}
            canPrint={canPrint}
            forceKind="PRODUCT"
            triggerLabel={labels.printProductLabel}
          />
          <ProductBarcodePrintDialog
            products={[product]}
            canPrint={canPrint}
            forceKind="MINI_PRODUCT"
            triggerLabel={labels.printMiniLabel}
          />
          {!canPrint ? (
            <p className="border border-[#d8a344]/25 bg-[#0f0b07] px-4 py-3 text-sm leading-6 text-[#e8dcc8]/64">
              {labels.printPermissionRequired}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
