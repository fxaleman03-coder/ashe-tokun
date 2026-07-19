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

function getBarcodeRenderOptions(kind: ProductBarcodeLabelKind) {
  if (kind === "SHELF") {
    return {
      barHeight: 48,
      moduleWidth: 1.1,
      quietZone: 10,
      showText: false,
    };
  }

  if (kind === "PRODUCT") {
    return {
      barHeight: 30,
      moduleWidth: 0.78,
      quietZone: 7,
      showText: false,
    };
  }

  return {
    barHeight: 16,
    moduleWidth: 0.48,
    quietZone: 5,
    showText: false,
  };
}

export default function ProductBarcodeLabel({
  product,
  kind,
}: ProductBarcodeLabelProps) {
  const barcodeSvg = renderCode128Svg(
    product.barcodeValue,
    getBarcodeRenderOptions(kind),
  );
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
