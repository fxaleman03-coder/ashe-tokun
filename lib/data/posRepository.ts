import { USE_SUPABASE } from "@/lib/config";
import {
  getInventoryItems,
  getInventoryLocations,
  type InventoryItem,
} from "@/lib/data/inventoryRepository";
import { getProducts } from "@/lib/data/productsRepository";
import { products as localProducts } from "@/lib/products";
import { supabase } from "@/lib/supabase";
import type {
  PosDataSource,
  PosInventoryLocation,
  PosProduct,
} from "@/lib/types/pos";

export type PosCustomer = {
  id: string | null;
  customerNumber: string;
  name: string;
  source: PosDataSource;
};

export type RecentPosOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  sales_channel: string;
  order_status: string;
  payment_status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  item_count: number;
  receipt_number: string | null;
  created_at: string;
};

export type PosOrderDetail = RecentPosOrder & {
  customer_number: string | null;
  notes: string | null;
  items: {
    id: string;
    product_id: string | null;
    product_name: string;
    brand_name: string | null;
    sku: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    tax: number;
    line_total: number;
  }[];
  payments: {
    id: string;
    payment_method: string;
    payment_status: string;
    amount: number;
    reference_number: string | null;
    received_at: string | null;
    created_at: string;
  }[];
  receipts: {
    id: string;
    receipt_number: string;
    printed: boolean;
    emailed: boolean;
    created_at: string;
  }[];
  inventoryTransactions: {
    id: string;
    transaction_type: string;
    quantity_change: number;
    balance_after: number;
    notes: string | null;
    created_at: string;
  }[];
};

type NumberedRow = {
  order_number?: string | null;
  receipt_number?: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  sales_channel: string;
  order_status: string;
  payment_status: string;
  subtotal: number | string | null;
  discount_total: number | string | null;
  tax_total: number | string | null;
  grand_total: number | string | null;
  created_at: string;
  notes?: string | null;
  customer?: {
    customer_number?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
  order_items?:
    | {
        id: string;
        product_id?: string | null;
        product_name?: string;
        brand_name?: string | null;
        sku?: string | null;
        quantity?: number;
        unit_price?: number | string | null;
        discount?: number | string | null;
        tax?: number | string | null;
        line_total?: number | string | null;
      }[]
    | null;
  receipts?:
    | {
        id?: string;
        receipt_number?: string | null;
        printed?: boolean;
        emailed?: boolean;
        created_at?: string;
      }[]
    | null;
};

type OrderDetailRow = OrderRow & {
  order_items?: {
    id: string;
    product_id: string | null;
    product_name: string;
    brand_name: string | null;
    sku: string | null;
    quantity: number;
    unit_price: number | string | null;
    discount: number | string | null;
    tax: number | string | null;
    line_total: number | string | null;
  }[] | null;
  payments?: {
    id: string;
    payment_method: string;
    payment_status: string;
    amount: number | string | null;
    reference_number: string | null;
    received_at: string | null;
    created_at: string;
  }[] | null;
  receipts?: {
    id: string;
    receipt_number: string;
    printed: boolean;
    emailed: boolean;
    created_at: string;
  }[] | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getLocationPriority(location: PosInventoryLocation) {
  if (location.name === "Retail Floor") {
    return 0;
  }

  if (location.name === "Main Stockroom") {
    return 1;
  }

  return 2;
}

function getLocalPosProducts(): PosProduct[] {
  return localProducts
    .filter((product) => product.availableInStore)
    .map((product) => ({
      id: product.id,
      name: product.name.en,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      vendorSku: product.vendorSku,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      cost: product.cost,
      image: product.image,
      brand: product.vendor,
      category: product.category.en,
      availableQuantity: product.stock,
      inventoryByLocation: [
        {
          locationId: "local-main-stockroom",
          locationName: product.inventoryLocation ?? "Local Inventory",
          availableQuantity: product.stock,
          onHandQuantity: product.stock,
        },
      ],
    }));
}

function getCustomerName(
  customer: OrderRow["customer"],
  fallback = "Walk-in Customer",
) {
  if (!customer) {
    return fallback;
  }

  if (customer.company_name) {
    return customer.company_name;
  }

  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    fallback;
}

function getNextNumberFromRows(
  rows: NumberedRow[] | null,
  field: keyof NumberedRow,
  prefix: string,
) {
  const nextNumber =
    (rows ?? [])
      .map((row) => row[field])
      .filter(Boolean)
      .map((value) => {
        const match = String(value).match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0) + 1;

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
}

export async function getPosInventoryLocations(): Promise<PosInventoryLocation[]> {
  const locations = await getInventoryLocations();

  return locations
    .filter((location) => location.active)
    .map((location) => ({
      id: location.id,
      name: location.name,
      code: location.code,
      locationType: location.location_type,
      active: location.active,
    }))
    .sort(
      (first, second) =>
        getLocationPriority(first) - getLocationPriority(second) ||
        first.name.localeCompare(second.name),
    );
}

export async function getPosProducts(): Promise<PosProduct[]> {
  if (!USE_SUPABASE) {
    return getLocalPosProducts();
  }

  const [products, inventoryItems] = await Promise.all([
    getProducts(),
    getInventoryItems(),
  ]);
  const inventoryByProductId = new Map<string, InventoryItem[]>();

  for (const item of inventoryItems) {
    const productItems = inventoryByProductId.get(item.product_id) ?? [];
    productItems.push(item);
    inventoryByProductId.set(item.product_id, productItems);
  }

  return products
    .filter((product) => product.availableInStore)
    .map((product) => {
      const productInventoryItems = inventoryByProductId.get(product.id) ?? [];
      const inventoryByLocation = productInventoryItems.map((item) => ({
        locationId: item.location_id,
        locationName: item.location_name,
        availableQuantity: item.available_quantity,
        onHandQuantity: item.on_hand_quantity,
      }));
      const availableQuantity = inventoryByLocation.reduce(
        (total, item) => total + item.availableQuantity,
        0,
      );

      return {
        id: product.id,
        name: product.name.en,
        slug: product.slug,
        sku: product.sku,
        barcode: product.barcode,
        vendorSku: product.vendorSku,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        cost: product.cost,
        image: product.image,
        brand: product.vendor,
        category: product.category.en,
        availableQuantity,
        inventoryByLocation,
      };
    });
}

export async function getPosProductBySkuOrBarcode(
  value: string,
): Promise<PosProduct | undefined> {
  const normalizedValue = value.trim().toLowerCase();
  const products = await getPosProducts();

  return products.find(
    (product) =>
      product.sku.toLowerCase() === normalizedValue ||
      product.barcode.toLowerCase() === normalizedValue,
  );
}

export async function getWalkInCustomer(): Promise<PosCustomer> {
  if (!USE_SUPABASE || !supabase) {
    return {
      id: null,
      customerNumber: "CUST-WALK-IN",
      name: "Walk-in Customer",
      source: "Local fallback",
    };
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_number, first_name, last_name, company_name")
    .eq("customer_number", "CUST-WALK-IN")
    .maybeSingle<{
      id: string;
      customer_number: string;
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
    }>();

  if (error || !data) {
    return {
      id: null,
      customerNumber: "CUST-WALK-IN",
      name: "Walk-in Customer",
      source: "Local fallback",
    };
  }

  return {
    id: data.id,
    customerNumber: data.customer_number,
    name: getCustomerName(data),
    source: "Supabase",
  };
}

export async function getRecentPosOrders(limit = 20): Promise<RecentPosOrder[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        sales_channel,
        order_status,
        payment_status,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        created_at,
        customer:customers(first_name, last_name, company_name),
        order_items(id),
        receipts(receipt_number)
      `,
    )
    .eq("sales_channel", "POS")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.info("[ASHE TOKUN POS repository]", "Recent POS order read failed.", {
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return [];
  }

  return ((data ?? []) as OrderRow[]).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    customer_name: getCustomerName(order.customer),
    sales_channel: order.sales_channel,
    order_status: order.order_status,
    payment_status: order.payment_status,
    subtotal: toNumber(order.subtotal),
    discount_total: toNumber(order.discount_total),
    tax_total: toNumber(order.tax_total),
    grand_total: toNumber(order.grand_total),
    item_count: order.order_items?.length ?? 0,
    receipt_number: order.receipts?.[0]?.receipt_number ?? null,
    created_at: order.created_at,
  }));
}

export async function getPosOrderDetail(
  orderId: string,
): Promise<PosOrderDetail | null> {
  if (!USE_SUPABASE || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        sales_channel,
        order_status,
        payment_status,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        notes,
        created_at,
        customer:customers(customer_number, first_name, last_name, company_name),
        order_items(
          id,
          product_id,
          product_name,
          brand_name,
          sku,
          quantity,
          unit_price,
          discount,
          tax,
          line_total
        ),
        payments(
          id,
          payment_method,
          payment_status,
          amount,
          reference_number,
          received_at,
          created_at
        ),
        receipts(id, receipt_number, printed, emailed, created_at)
      `,
    )
    .eq("id", orderId)
    .maybeSingle<OrderDetailRow>();

  if (error || !data) {
    console.info("[ASHE TOKUN POS repository]", "Order detail read failed.", {
      orderId,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
    });

    return null;
  }

  const inventoryResult = await supabase
    .from("inventory_transactions")
    .select("id, transaction_type, quantity_change, balance_after, notes, created_at")
    .eq("reference_type", "POS")
    .eq("reference_id", orderId)
    .order("created_at", { ascending: true });

  return {
    id: data.id,
    order_number: data.order_number,
    customer_name: getCustomerName(data.customer),
    customer_number: data.customer?.customer_number ?? null,
    sales_channel: data.sales_channel,
    order_status: data.order_status,
    payment_status: data.payment_status,
    subtotal: toNumber(data.subtotal),
    discount_total: toNumber(data.discount_total),
    tax_total: toNumber(data.tax_total),
    grand_total: toNumber(data.grand_total),
    item_count: data.order_items?.length ?? 0,
    receipt_number: data.receipts?.[0]?.receipt_number ?? null,
    created_at: data.created_at,
    notes: data.notes ?? null,
    items: (data.order_items ?? []).map((item) => ({
      id: item.id,
      product_id: item.product_id ?? null,
      product_name: item.product_name ?? "Unknown Product",
      brand_name: item.brand_name ?? null,
      sku: item.sku ?? null,
      quantity: item.quantity ?? 0,
      unit_price: toNumber(item.unit_price),
      discount: toNumber(item.discount),
      tax: toNumber(item.tax),
      line_total: toNumber(item.line_total),
    })),
    payments: (data.payments ?? []).map((payment) => ({
      id: payment.id,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      amount: toNumber(payment.amount),
      reference_number: payment.reference_number,
      received_at: payment.received_at,
      created_at: payment.created_at,
    })),
    receipts: data.receipts ?? [],
    inventoryTransactions:
      inventoryResult.error || !inventoryResult.data
        ? []
        : (inventoryResult.data as PosOrderDetail["inventoryTransactions"]),
  };
}

export async function getNextOrderNumber() {
  if (!USE_SUPABASE || !supabase) {
    return "ASH-ORD-000001";
  }

  const { data, error } = await supabase
    .from("orders")
    .select("order_number")
    .like("order_number", "ASH-ORD-%")
    .order("order_number", { ascending: false })
    .limit(25);

  if (error) {
    console.info("[ASHE TOKUN POS repository]", "Order number read failed.", {
      errorMessage: error.message,
    });
  }

  return getNextNumberFromRows(data, "order_number", "ASH-ORD-");
}

export async function getNextReceiptNumber() {
  if (!USE_SUPABASE || !supabase) {
    return "ASH-000001";
  }

  const { data, error } = await supabase
    .from("receipts")
    .select("receipt_number")
    .like("receipt_number", "ASH-%")
    .order("receipt_number", { ascending: false })
    .limit(25);

  if (error) {
    console.info("[ASHE TOKUN POS repository]", "Receipt number read failed.", {
      errorMessage: error.message,
    });
  }

  return getNextNumberFromRows(data, "receipt_number", "ASH-");
}
