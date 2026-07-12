import { USE_SUPABASE } from "@/lib/config";
import { getOrderById, getOrderItems, getOrders } from "@/lib/data/ordersRepository";
import { supabase } from "@/lib/supabase";
import type {
  ReturnFilters,
  ReturnItem,
  ReturnMetrics,
  ReturnRecord,
  ReturnTimelineEvent,
  ReturnableOrderItem,
} from "@/lib/types/return";
import {
  getCustomerContactName,
  getCustomerPrimaryName,
  isBusinessCustomer,
} from "@/lib/utils/customerDisplay";

type ReturnRow = {
  id: string;
  return_number: string;
  order_id: string | null;
  customer_id: string | null;
  return_type: ReturnRecord["return_type"];
  status: ReturnRecord["status"];
  refund_total: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    order_number?: string | null;
    customer?: {
      customer_number?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      company_name?: string | null;
    } | null;
  } | null;
  return_items?: { id: string; quantity?: number | null }[] | null;
};

type SaleTransactionWithInventory = {
  inventory_item_id: string;
  quantity_change: number;
  inventory_item?: {
    product_id?: string | null;
    location_id?: string | null;
  } | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getCustomerName(row: ReturnRow) {
  return getCustomerPrimaryName(row.order?.customer ?? {}) || "Walk-in Customer";
}

function getCustomerContact(row: ReturnRow) {
  const customer = row.order?.customer;

  return customer && isBusinessCustomer(customer)
    ? getCustomerContactName(customer)
    : null;
}

function normalizeReturn(row: ReturnRow): ReturnRecord {
  return {
    id: row.id,
    return_number: row.return_number,
    order_id: row.order_id,
    order_number: row.order?.order_number ?? null,
    customer_id: row.customer_id,
    customer_name: getCustomerName(row),
    customer_contact: getCustomerContact(row),
    return_type: row.return_type,
    status: row.status,
    refund_total: toNumber(row.refund_total),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item_count: row.return_items?.length ?? 0,
  };
}

function applyFilters(returns: ReturnRecord[], filters?: ReturnFilters) {
  if (!filters) {
    return returns;
  }

  const search = filters.search?.trim().toLowerCase();
  const orderNumber = filters.orderNumber?.trim().toLowerCase();
  const customer = filters.customer?.trim().toLowerCase();
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

  return returns.filter((returnRecord) => {
    const createdAt = new Date(returnRecord.created_at);
    const customerSearch = [
      returnRecord.customer_name,
      returnRecord.customer_contact,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!search || returnRecord.return_number.toLowerCase().includes(search)) &&
      (!orderNumber ||
        returnRecord.order_number?.toLowerCase().includes(orderNumber)) &&
      (!customer || customerSearch.includes(customer)) &&
      (!filters.returnType ||
        filters.returnType === "all" ||
        returnRecord.return_type === filters.returnType) &&
      (!filters.returnStatus ||
        filters.returnStatus === "all" ||
        returnRecord.status === filters.returnStatus) &&
      (!dateFrom || createdAt >= dateFrom) &&
      (!dateTo || createdAt <= dateTo) &&
      (filters.minimumRefundAmount === undefined ||
        returnRecord.refund_total >= filters.minimumRefundAmount) &&
      (filters.maximumRefundAmount === undefined ||
        returnRecord.refund_total <= filters.maximumRefundAmount)
    );
  });
}

async function readReturns() {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("returns")
    .select(
      `
        id,
        return_number,
        order_id,
        customer_id,
        return_type,
        status,
        refund_total,
        notes,
        created_at,
        updated_at,
        order:orders(
          order_number,
          customer:customers(customer_number, first_name, last_name, company_name)
        ),
        return_items(id, quantity)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.info("[ASHE TOKUN returns repository]", "Return read failed.", {
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return [];
  }

  return ((data ?? []) as ReturnRow[]).map(normalizeReturn);
}

export async function getReturns(filters?: ReturnFilters) {
  return applyFilters(await readReturns(), filters);
}

export async function getReturnById(returnId: string) {
  const returns = await getReturns();

  return returns.find((returnRecord) => returnRecord.id === returnId) ?? null;
}

export async function getReturnsByOrder(orderId: string) {
  const returns = await getReturns();

  return returns.filter((returnRecord) => returnRecord.order_id === orderId);
}

export async function getReturnItems(returnId: string): Promise<ReturnItem[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("return_items")
    .select("*")
    .eq("return_id", returnId)
    .order("created_at", { ascending: true });

  if (error) {
    console.info("[ASHE TOKUN returns repository]", "Return item read failed.", {
      returnId,
      errorMessage: error.message,
    });

    return [];
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    return_id: item.return_id,
    order_item_id: item.order_item_id ?? null,
    product_id: item.product_id ?? null,
    product_name: item.product_name,
    sku: item.sku ?? null,
    quantity: item.quantity,
    reason: item.reason ?? null,
    condition: item.condition ?? null,
    refund_amount: toNumber(item.refund_amount),
    created_at: item.created_at,
  }));
}

async function getCompletedReturnQuantityByOrderItem(orderId: string) {
  const completedReturns = (await getReturnsByOrder(orderId)).filter(
    (returnRecord) => returnRecord.status === "completed",
  );
  const quantities = new Map<string, number>();

  for (const returnRecord of completedReturns) {
    const returnItems = await getReturnItems(returnRecord.id);

    for (const item of returnItems) {
      if (!item.order_item_id) {
        continue;
      }

      quantities.set(
        item.order_item_id,
        (quantities.get(item.order_item_id) ?? 0) + item.quantity,
      );
    }
  }

  return quantities;
}

async function getOriginalInventoryLocations(orderId: string) {
  if (!USE_SUPABASE || !supabase) {
    return new Map<string, string | null>();
  }

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("inventory_item_id, quantity_change, inventory_item:inventory_items(product_id, location_id)")
    .eq("reference_type", "POS")
    .eq("reference_id", orderId)
    .eq("transaction_type", "sale");

  if (error) {
    return new Map<string, string | null>();
  }

  const locations = new Map<string, string | null>();

  for (const transaction of (data ?? []) as SaleTransactionWithInventory[]) {
    const productId = transaction.inventory_item?.product_id;

    if (productId && !locations.has(productId)) {
      locations.set(productId, transaction.inventory_item?.location_id ?? null);
    }
  }

  return locations;
}

export async function getReturnableOrderItems(orderId: string) {
  const [order, orderItems, returnedQuantities, inventoryLocations] =
    await Promise.all([
      getOrderById(orderId),
      getOrderItems(orderId),
      getCompletedReturnQuantityByOrderItem(orderId),
      getOriginalInventoryLocations(orderId),
    ]);

  if (!order || order.order_status === "draft" || order.order_status === "cancelled") {
    return [];
  }

  return orderItems.map<ReturnableOrderItem>((item) => {
    const quantityAlreadyReturned = returnedQuantities.get(item.id) ?? 0;
    const quantityReturnable = Math.max(
      item.quantity - quantityAlreadyReturned,
      0,
    );

    return {
      order_item_id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      quantity_purchased: item.quantity,
      quantity_already_returned: quantityAlreadyReturned,
      quantity_returnable: quantityReturnable,
      unit_price: item.unit_price,
      line_total: item.line_total,
      original_inventory_location_id: item.product_id
        ? inventoryLocations.get(item.product_id) ?? null
        : null,
    };
  });
}

export async function getReturnMetrics(): Promise<ReturnMetrics> {
  const returns = await getReturns();
  const activeReturns = returns.filter(
    (returnRecord) => returnRecord.status !== "cancelled",
  );
  const completedReturns = returns.filter(
    (returnRecord) => returnRecord.status === "completed",
  );
  let totalReturnedUnits = 0;

  for (const returnRecord of completedReturns) {
    const items = await getReturnItems(returnRecord.id);
    totalReturnedUnits += items.reduce((total, item) => total + item.quantity, 0);
  }

  return {
    totalReturns: returns.length,
    requestedReturns: returns.filter(
      (returnRecord) => returnRecord.status === "requested",
    ).length,
    approvedReturns: returns.filter(
      (returnRecord) => returnRecord.status === "approved",
    ).length,
    receivedReturns: returns.filter(
      (returnRecord) => returnRecord.status === "received",
    ).length,
    completedReturns: completedReturns.length,
    cancelledReturns: returns.filter(
      (returnRecord) => returnRecord.status === "cancelled",
    ).length,
    refundReturns: returns.filter(
      (returnRecord) => returnRecord.return_type === "refund",
    ).length,
    exchangeReturns: returns.filter(
      (returnRecord) => returnRecord.return_type === "exchange",
    ).length,
    storeCreditReturns: returns.filter(
      (returnRecord) => returnRecord.return_type === "store_credit",
    ).length,
    totalRefunded: activeReturns
      .filter((returnRecord) => returnRecord.status === "completed")
      .reduce((total, returnRecord) => total + returnRecord.refund_total, 0),
    totalReturnedUnits,
  };
}

export async function getReturnTimeline(returnId: string) {
  const returnRecord = await getReturnById(returnId);

  if (!returnRecord) {
    return [];
  }

  const events: ReturnTimelineEvent[] = [
    {
      id: `requested-${returnRecord.id}`,
      label: "Requested",
      description: `${returnRecord.return_type.replace("_", " ")} return requested.`,
      created_at: returnRecord.created_at,
    },
  ];

  if (returnRecord.notes) {
    events.push({
      id: `notes-${returnRecord.id}`,
      label: "Operational Notes",
      description: returnRecord.notes,
      created_at: returnRecord.updated_at ?? returnRecord.created_at,
    });
  }

  return events;
}

export async function getEligibleReturnOrders() {
  const orders = await getOrders();

  return orders.filter(
    (order) =>
      order.order_status !== "draft" &&
      order.order_status !== "cancelled" &&
      order.item_count > 0,
  );
}
