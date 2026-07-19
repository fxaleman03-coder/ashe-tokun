export type PublicCartLine = {
  productId: string;
  quantity: number;
};

export type PublicCheckoutAddress = {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type PublicCheckoutInput = {
  idempotencyKey: string;
  cartItems: PublicCartLine[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  billingAddress: PublicCheckoutAddress;
  shippingAddress: PublicCheckoutAddress;
  sameAsBilling: boolean;
  orderNotes?: string;
};

export type PublicCheckoutOrderItem = {
  productId: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PublicCheckoutSummary = {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
};

export type PublicCheckoutResult =
  | {
      ok: true;
      orderNumber: string;
      confirmationToken: string;
      customerEmail: string;
      summary: PublicCheckoutSummary;
      items: PublicCheckoutOrderItem[];
      message: string;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

export type PublicOrderConfirmation = {
  orderNumber: string;
  customerEmail: string | null;
  customerName: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  summary: PublicCheckoutSummary;
  items: PublicCheckoutOrderItem[];
};
