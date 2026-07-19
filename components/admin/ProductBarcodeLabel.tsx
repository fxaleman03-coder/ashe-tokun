import { renderCode128Svg } from "@/lib/barcodes/code128";

export type ProductBarcodeLabelKind = "SHELF" | "PRODUCT" | "MINI_PRODUCT";

export type ProductBarcodeLabelProduct = {
  id: string;
  name: string;
  sku: string;
  barcodeValue: string;
  price?: number;
};

type ProductBarcodeLabelProps = {
  product: ProductBarcodeLabelProduct;
  kind: ProductBarcodeLabelKind;
};

function formatPrice(price?: number) {
  if (typeof price !== "number") {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function ProductBarcodeLabel({
  product,
  kind,
}: ProductBarcodeLabelProps) {
  const barcodeSvg = renderCode128Svg(product.barcodeValue, {
    barHeight: kind === "MINI_PRODUCT" ? 44 : 62,
    moduleWidth: kind === "MINI_PRODUCT" ? 1 : 1.4,
    quietZone: kind === "MINI_PRODUCT" ? 8 : 12,
    showText: false,
  });
  const price = formatPrice(product.price);

  return (
    <article
      className={`product-barcode-label product-barcode-label-${kind.toLowerCase().replaceAll("_", "-")}`}
    >
      {kind === "SHELF" ? (
        <div className="product-barcode-label-heading">
          <p className="product-barcode-brand">ASHE TOKUN</p>
          <div>
            <p className="product-barcode-product-name">{product.name}</p>
            {price ? <p className="product-barcode-price">{price}</p> : null}
          </div>
        </div>
      ) : null}

      <div
        className="product-barcode-svg"
        dangerouslySetInnerHTML={{ __html: barcodeSvg }}
      />

      <p className="product-barcode-value">{product.barcodeValue}</p>

      {kind !== "MINI_PRODUCT" ? (
        <p className="product-barcode-sku">SKU {product.sku}</p>
      ) : null}
    </article>
  );
}
