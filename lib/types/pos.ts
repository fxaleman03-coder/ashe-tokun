export type PosDataSource = "Supabase" | "Local fallback";

export type PosInventoryLocation = {
  id: string;
  name: string;
  code: string;
  locationType: string;
  active: boolean;
};

export type PosInventoryByLocation = {
  locationId: string;
  locationName: string;
  availableQuantity: number;
  onHandQuantity: number;
};

export type PosProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  barcodeValue?: string;
  barcodeFormat?: "CODE128";
  vendorSku?: string;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  image: string | null;
  brand: string;
  category: string;
  availableQuantity: number;
  inventoryByLocation: PosInventoryByLocation[];
};

export type PosCustomer = {
  id: string | null;
  customerNumber: string;
  name: string;
  customerType: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  orderCount: number;
  lifetimeValue: number;
  source: PosDataSource;
};

export type PosCartItem = {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  barcodeValue?: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  availableQuantity: number;
  locationId: string;
  brand: string;
};

export type PosDiscount = {
  type: "none" | "percentage" | "fixed";
  value: number;
};

export type PosPaymentInput = {
  method: "cash" | "card" | "zelle" | "other";
  amountTendered: number;
};

export type PosSaleInput = {
  customerId: string | null;
  inventoryLocationId: string;
  cartItems: PosCartItem[];
  discountType: PosDiscount["type"];
  discountValue: number;
  taxRate: number;
  paymentMethod: PosPaymentInput["method"];
  amountTendered: number;
  cashierName: string;
  notes?: string;
};

export type PosSaleResult =
  | {
      ok: true;
      source: "supabase";
      orderId: string;
      orderNumber: string;
      receiptNumber: string;
      paymentStatus: string;
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      total: number;
      amountTendered: number;
      changeDue: number;
    }
  | {
      ok: true;
      source: "local";
      message: string;
    }
  | {
      ok: false;
      error: string;
      critical?: boolean;
      orderId?: string;
      orderNumber?: string;
    };
