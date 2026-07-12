import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import {
  getCustomerContactName,
  getCustomerPrimaryName,
  isBusinessCustomer,
} from "@/lib/utils/customerDisplay";

export type OrderStatus = "draft" | "completed" | "cancelled" | "refunded" | "held";
export type PaymentStatus = "pending" | "paid" | "partially_paid" | "refunded";
export type SalesChannel = "POS" | "Website" | "Manual" | "Phone" | "Marketplace" | "Mobile";

export type OrderFilters = {
  search?: string;
  salesChannel?: string;
  orderStatus?: string;
  paymentStatus?: string;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  minimumTotal?: number;
  maximumTotal?: number;
};

export type AdminOrder = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer: string;
  customer_contact: string | null;
  customer_number: string | null;
  sales_channel: SalesChannel;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  item_count: number;
  payment_methods: string[];
  receipt_number: string | null;
};

export type AdminOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  brand_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  line_total: number;
  created_at: string;
};

export type AdminOrderPayment = {
  id: string;
  payment_method: string;
  amount: number;
  reference_number: string | null;
  payment_status: PaymentStatus;
  received_at: string | null;
  created_at: string;
};

export type AdminOrderReceipt = {
  id: string;
  receipt_number: string;
  printed: boolean;
  emailed: boolean;
  printed_at: string | null;
  emailed_at: string | null;
  created_at: string;
};

export type AdminOrderInventoryTransaction = {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  reference_type: string;
  reference_id: string | null;
  quantity_change: number;
  balance_after: number;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
};

export type AdminOrderTimelineEvent = {
  id: string;
  label: string;
  description: string;
  created_at: string;
};

export type AdminOrderDetail = AdminOrder & {
  items: AdminOrderItem[];
  payments: AdminOrderPayment[];
  receipts: AdminOrderReceipt[];
  inventoryTransactions: AdminOrderInventoryTransaction[];
  timeline: AdminOrderTimelineEvent[];
};

export type OrderSummaryMetrics = {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  completedOrders: number;
  heldOrders: number;
  cancelledOrders: number;
  paidOrders: number;
  pendingPaymentOrders: number;
  posOrders: number;
  onlineOrders: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  sales_channel: SalesChannel;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number | string | null;
  discount_total: number | string | null;
  tax_total: number | string | null;
  grand_total: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
  customer_id?: string | null;
  customer?: {
    customer_number?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
  order_items?: { id: string; quantity?: number | null }[] | null;
  payments?: { payment_method: string | null }[] | null;
  receipts?: { receipt_number: string | null }[] | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getCustomerName(order: OrderRow) {
  if (order.customer?.company_name) {
    return getCustomerPrimaryName(order.customer);
  }

  return getCustomerPrimaryName(order.customer ?? {}) || "Walk-in Customer";
}

function getDerivedFulfillmentStatus(order: OrderRow) {
  if (order.order_status === "cancelled") {
    return "cancelled";
  }

  if (order.order_status === "held") {
    return "held";
  }

  if (order.order_status === "completed") {
    return "fulfilled";
  }

  return "pending";
}

type ShipmentQuantityRow = {
  order_id: string;
  shipment_status: string;
  fulfillment_type: string;
  shipment_items?: { quantity: number | null }[] | null;
};

async function getShipmentFulfillmentSummaries(orders: OrderRow[]) {
  const summaries = new Map<string, string>();

  if (!USE_SUPABASE || !supabase || orders.length === 0) {
    return summaries;
  }

  const orderIds = orders.map((order) => order.id);
  const orderedQuantities = new Map(
    orders.map((order) => [
      order.id,
      (order.order_items ?? []).reduce(
        (total, item) => total + Number(item.quantity ?? 0),
        0,
      ),
    ]),
  );

  const { data, error } = await supabase
    .from("shipments")
    .select("order_id, shipment_status, fulfillment_type, shipment_items(quantity)")
    .in("order_id", orderIds);

  if (error) {
    return summaries;
  }

  const shipmentsByOrder = new Map<string, ShipmentQuantityRow[]>();

  for (const row of (data ?? []) as ShipmentQuantityRow[]) {
    shipmentsByOrder.set(row.order_id, [
      ...(shipmentsByOrder.get(row.order_id) ?? []),
      row,
    ]);
  }

  for (const order of orders) {
    const shipments = (shipmentsByOrder.get(order.id) ?? []).filter(
      (shipment) => shipment.shipment_status !== "cancelled",
    );
    const totalOrdered = orderedQuantities.get(order.id) ?? 0;
    const totalFulfilled = shipments.reduce(
      (total, shipment) =>
        total +
        (shipment.shipment_items ?? []).reduce(
          (shipmentTotal, item) => shipmentTotal + Number(item.quantity ?? 0),
          0,
        ),
      0,
    );

    if (shipments.some((shipment) => shipment.shipment_status === "ready")) {
      summaries.set(order.id, "Local Pickup Ready");
    } else if (
      shipments.some((shipment) => shipment.shipment_status === "delivered")
    ) {
      summaries.set(
        order.id,
        totalFulfilled >= totalOrdered ? "Delivered" : "Partially Fulfilled",
      );
    } else if (totalOrdered === 0 || totalFulfilled === 0) {
      summaries.set(order.id, "Unfulfilled");
    } else {
      summaries.set(
        order.id,
        totalFulfilled >= totalOrdered ? "Fulfilled" : "Partially Fulfilled",
      );
    }
  }

  return summaries;
}

function normalizeOrder(row: OrderRow): AdminOrder {
  return {
    id: row.id,
    order_number: row.order_number,
    customer_id: row.customer_id ?? null,
    customer: getCustomerName(row),
    customer_contact:
      row.customer && isBusinessCustomer(row.customer)
        ? getCustomerContactName(row.customer)
        : null,
    customer_number: row.customer?.customer_number ?? null,
    sales_channel: row.sales_channel,
    order_status: row.order_status,
    payment_status: row.payment_status,
    fulfillment_status: getDerivedFulfillmentStatus(row),
    subtotal: toNumber(row.subtotal),
    discount_total: toNumber(row.discount_total),
    tax_total: toNumber(row.tax_total),
    grand_total: toNumber(row.grand_total),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    item_count: row.order_items?.length ?? 0,
    payment_methods: Array.from(
      new Set((row.payments ?? []).map((payment) => payment.payment_method ?? "")),
    ).filter(Boolean),
    receipt_number: row.receipts?.[0]?.receipt_number ?? null,
  };
}

function applyFilters(orders: AdminOrder[], filters?: OrderFilters) {
  if (!filters) {
    return orders;
  }

  const search = filters.search?.trim().toLowerCase();
  const customer = filters.customer?.trim().toLowerCase();
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

  return orders.filter((order) => {
    const createdAt = new Date(order.created_at);
    const matchesSearch =
      !search ||
      order.order_number.toLowerCase().includes(search) ||
      order.receipt_number?.toLowerCase().includes(search);
    const matchesCustomer =
      !customer ||
      [order.customer, order.customer_contact]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(customer);
    const matchesChannel =
      !filters.salesChannel ||
      filters.salesChannel === "all" ||
      order.sales_channel === filters.salesChannel;
    const matchesOrderStatus =
      !filters.orderStatus ||
      filters.orderStatus === "all" ||
      order.order_status === filters.orderStatus;
    const matchesPaymentStatus =
      !filters.paymentStatus ||
      filters.paymentStatus === "all" ||
      order.payment_status === filters.paymentStatus;
    const matchesDateFrom = !dateFrom || createdAt >= dateFrom;
    const matchesDateTo = !dateTo || createdAt <= dateTo;
    const matchesMinimum =
      filters.minimumTotal === undefined ||
      order.grand_total >= filters.minimumTotal;
    const matchesMaximum =
      filters.maximumTotal === undefined ||
      order.grand_total <= filters.maximumTotal;

    return (
      matchesSearch &&
      matchesCustomer &&
      matchesChannel &&
      matchesOrderStatus &&
      matchesPaymentStatus &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesMinimum &&
      matchesMaximum
    );
  });
}

async function readOrders(): Promise<AdminOrder[]> {
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
        notes,
        created_at,
        updated_at,
        customer_id,
        customer:customers(customer_number, first_name, last_name, company_name),
        order_items(id, quantity),
        payments(payment_method),
        receipts(receipt_number)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.info("[ASHE TOKUN orders repository]", "Order read failed.", {
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return [];
  }

  const rows = (data ?? []) as OrderRow[];
  const fulfillmentSummaries = await getShipmentFulfillmentSummaries(rows);

  return rows.map((row) => ({
    ...normalizeOrder(row),
    fulfillment_status:
      fulfillmentSummaries.get(row.id) ?? getDerivedFulfillmentStatus(row),
  }));
}

export async function getOrders(filters?: OrderFilters) {
  return applyFilters(await readOrders(), filters);
}

export async function getOrderById(orderId: string) {
  const orders = await getOrders();

  return orders.find((order) => order.id === orderId) ?? null;
}

export async function getOrderByNumber(orderNumber: string) {
  const orders = await getOrders();

  return (
    orders.find(
      (order) => order.order_number.toLowerCase() === orderNumber.toLowerCase(),
    ) ?? null
  );
}

export async function getOrderItems(orderId: string): Promise<AdminOrderItem[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id ?? null,
    product_name: item.product_name,
    brand_name: item.brand_name ?? null,
    sku: item.sku ?? null,
    quantity: item.quantity,
    unit_price: toNumber(item.unit_price),
    discount: toNumber(item.discount),
    tax: toNumber(item.tax),
    line_total: toNumber(item.line_total),
    created_at: item.created_at,
  }));
}

export async function getOrderPayments(
  orderId: string,
): Promise<AdminOrderPayment[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((payment) => ({
    id: payment.id,
    payment_method: payment.payment_method,
    amount: toNumber(payment.amount),
    reference_number: payment.reference_number ?? null,
    payment_status: payment.payment_status,
    received_at: payment.received_at ?? null,
    created_at: payment.created_at,
  }));
}

export async function getOrderReceipt(
  orderId: string,
): Promise<AdminOrderReceipt | null> {
  if (!USE_SUPABASE || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AdminOrderReceipt;
}

export async function getOrderInventoryTransactions(
  orderId: string,
): Promise<AdminOrderInventoryTransaction[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("reference_type", "POS")
    .eq("reference_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as AdminOrderInventoryTransaction[];
}

export async function getOrderDetail(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const order = await getOrderById(orderId);

  if (!order) {
    return null;
  }

  const [items, payments, receipt, inventoryTransactions] = await Promise.all([
    getOrderItems(orderId),
    getOrderPayments(orderId),
    getOrderReceipt(orderId),
    getOrderInventoryTransactions(orderId),
  ]);
  const timeline: AdminOrderTimelineEvent[] = [
    {
      id: `created-${order.id}`,
      label: "Created",
      description: `${order.sales_channel} order created.`,
      created_at: order.created_at,
    },
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      label: "Payment",
      description: `${payment.payment_method} payment ${payment.payment_status} for ${payment.amount.toFixed(2)}.`,
      created_at: payment.received_at ?? payment.created_at,
    })),
    ...(receipt
      ? [
          {
            id: `receipt-${receipt.id}`,
            label: "Receipt Issued",
            description: receipt.receipt_number,
            created_at: receipt.created_at,
          },
        ]
      : []),
    ...inventoryTransactions.map((transaction) => ({
      id: `inventory-${transaction.id}`,
      label:
        transaction.transaction_type === "return"
          ? "Inventory Restored"
          : "Inventory Deducted",
      description: `${transaction.quantity_change} units / balance ${transaction.balance_after}. ${transaction.notes ?? ""}`,
      created_at: transaction.created_at,
    })),
  ].sort(
    (first, second) =>
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
  );

  if (order.notes) {
    timeline.push({
      id: `notes-${order.id}`,
      label: "Operational Notes",
      description: order.notes,
      created_at: order.updated_at ?? order.created_at,
    });
  }

  return {
    ...order,
    items,
    payments,
    receipts: receipt ? [receipt] : [],
    inventoryTransactions,
    timeline,
  };
}

export async function getOrderSummaryMetrics(): Promise<OrderSummaryMetrics> {
  const orders = await getOrders();
  const activeRevenueOrders = orders.filter(
    (order) => order.order_status !== "cancelled",
  );
  const totalRevenueCents = activeRevenueOrders.reduce(
    (total, order) => total + Math.round(order.grand_total * 100),
    0,
  );
  const completedOrders = orders.filter(
    (order) => order.order_status === "completed",
  ).length;

  return {
    totalOrders: orders.length,
    totalRevenue: totalRevenueCents / 100,
    averageOrderValue:
      activeRevenueOrders.length > 0
        ? totalRevenueCents / activeRevenueOrders.length / 100
        : 0,
    completedOrders,
    heldOrders: orders.filter((order) => order.order_status === "held").length,
    cancelledOrders: orders.filter((order) => order.order_status === "cancelled")
      .length,
    paidOrders: orders.filter((order) => order.payment_status === "paid").length,
    pendingPaymentOrders: orders.filter(
      (order) => order.payment_status === "pending",
    ).length,
    posOrders: orders.filter((order) => order.sales_channel === "POS").length,
    onlineOrders: orders.filter((order) => order.sales_channel === "Website")
      .length,
  };
}
