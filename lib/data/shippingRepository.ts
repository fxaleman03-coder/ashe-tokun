import { USE_SUPABASE } from "@/lib/config";
import { getOrderItems, getOrders } from "@/lib/data/ordersRepository";
import { supabase } from "@/lib/supabase";
import type {
  FulfillableOrderItem,
  FulfillmentType,
  Shipment,
  ShipmentAddress,
  ShipmentEvent,
  ShipmentFilters,
  ShipmentItem,
  ShipmentMetrics,
  ShipmentPackage,
  ShipmentStatus,
} from "@/lib/types/shipping";
import {
  getCustomerContactName,
  getCustomerPrimaryName,
  isBusinessCustomer,
} from "@/lib/utils/customerDisplay";

type ShipmentRow = {
  id: string;
  shipment_number: string;
  order_id: string;
  shipping_origin_id?: string | null;
  shipment_status: ShipmentStatus;
  fulfillment_type: FulfillmentType;
  carrier: string | null;
  service_level: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_cost: number | string | null;
  package_count: number | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  shipment_items?: { id: string }[] | null;
  order?: {
    id: string;
    order_number: string;
    customer_id: string | null;
    customer?: {
      customer_number?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      company_name?: string | null;
    } | null;
  } | null;
  shipping_origin?: {
    name?: string | null;
    company_name?: string | null;
  } | null;
};

type ShipmentItemRow = {
  id: string;
  shipment_id: string;
  order_item_id: string;
  quantity: number;
  created_at: string;
  order_item?: {
    product_name?: string | null;
    sku?: string | null;
    brand_name?: string | null;
  } | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeShipment(row: ShipmentRow): Shipment {
  const customer = row.order?.customer ?? null;

  return {
    id: row.id,
    shipment_number: row.shipment_number,
    order_id: row.order_id,
    shipping_origin_id: row.shipping_origin_id ?? null,
    shipping_origin_name:
      row.shipping_origin?.name ?? row.shipping_origin?.company_name ?? null,
    order_number: row.order?.order_number ?? null,
    customer_id: row.order?.customer_id ?? null,
    customer: getCustomerPrimaryName(customer ?? {}) || "Walk-in Customer",
    customer_contact:
      customer && isBusinessCustomer(customer)
        ? getCustomerContactName(customer)
        : null,
    shipment_status: row.shipment_status,
    fulfillment_type: row.fulfillment_type,
    carrier: row.carrier,
    service_level: row.service_level,
    tracking_number: row.tracking_number,
    tracking_url: row.tracking_url,
    shipping_cost: toNumber(row.shipping_cost),
    package_count: row.package_count ?? 1,
    shipped_at: row.shipped_at,
    delivered_at: row.delivered_at,
    cancelled_at: row.cancelled_at,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item_count: row.shipment_items?.length ?? 0,
  };
}

function applyFilters(shipments: Shipment[], filters?: ShipmentFilters) {
  if (!filters) {
    return shipments;
  }

  const search = filters.search?.trim().toLowerCase();
  const orderNumber = filters.orderNumber?.trim().toLowerCase();
  const customer = filters.customer?.trim().toLowerCase();
  const trackingNumber = filters.trackingNumber?.trim().toLowerCase();
  const carrier = filters.carrier?.trim().toLowerCase();
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

  return shipments.filter((shipment) => {
    const createdAt = new Date(shipment.created_at);
    const searchable = [
      shipment.shipment_number,
      shipment.order_number,
      shipment.customer,
      shipment.customer_contact,
      shipment.tracking_number,
      shipment.carrier,
      shipment.shipping_origin_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!search || searchable.includes(search)) &&
      (!orderNumber ||
        shipment.order_number?.toLowerCase().includes(orderNumber)) &&
      (!customer ||
        [shipment.customer, shipment.customer_contact]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(customer)) &&
      (!filters.shipmentStatus ||
        filters.shipmentStatus === "all" ||
        shipment.shipment_status === filters.shipmentStatus) &&
      (!filters.fulfillmentType ||
        filters.fulfillmentType === "all" ||
        shipment.fulfillment_type === filters.fulfillmentType) &&
      (!filters.shippingOrigin ||
        filters.shippingOrigin === "all" ||
        shipment.shipping_origin_id === filters.shippingOrigin) &&
      (!carrier || shipment.carrier?.toLowerCase().includes(carrier)) &&
      (!trackingNumber ||
        shipment.tracking_number?.toLowerCase().includes(trackingNumber)) &&
      (!dateFrom || createdAt >= dateFrom) &&
      (!dateTo || createdAt <= dateTo)
    );
  });
}

async function readShipments() {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipments")
    .select(
      `
        *,
        order:orders(
          id,
          order_number,
          customer_id,
          customer:customers(customer_number, first_name, last_name, company_name)
        ),
        shipping_origin:shipping_origins(name, company_name),
        shipment_items(id)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.info("[ASHE TOKUN shipping repository]", "Shipment read failed.", {
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return [];
  }

  return ((data ?? []) as ShipmentRow[]).map(normalizeShipment);
}

export async function getShipments(filters?: ShipmentFilters) {
  return applyFilters(await readShipments(), filters);
}

export async function getShipmentById(shipmentId: string) {
  const shipments = await getShipments();

  return shipments.find((shipment) => shipment.id === shipmentId) ?? null;
}

export async function getShipmentsByOrder(orderId: string) {
  const shipments = await getShipments();

  return shipments.filter((shipment) => shipment.order_id === orderId);
}

export async function getShipmentItems(shipmentId: string): Promise<ShipmentItem[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipment_items")
    .select(
      `
        *,
        order_item:order_items(product_name, sku, brand_name)
      `,
    )
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return ((data ?? []) as ShipmentItemRow[]).map((item) => ({
    id: item.id,
    shipment_id: item.shipment_id,
    order_item_id: item.order_item_id,
    product_name: item.order_item?.product_name ?? "Product",
    sku: item.order_item?.sku ?? null,
    brand_name: item.order_item?.brand_name ?? null,
    quantity: item.quantity,
    created_at: item.created_at,
  }));
}

export async function getShipmentPackages(
  shipmentId: string,
): Promise<ShipmentPackage[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipment_packages")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    shipment_id: row.shipment_id,
    package_number: row.package_number,
    length_in: row.length_in === null ? null : toNumber(row.length_in),
    width_in: row.width_in === null ? null : toNumber(row.width_in),
    height_in: row.height_in === null ? null : toNumber(row.height_in),
    weight_lb: row.weight_lb === null ? null : toNumber(row.weight_lb),
    package_type: row.package_type ?? null,
    label_url: row.label_url ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  }));
}

export async function getShipmentAddresses(
  shipmentId: string,
): Promise<ShipmentAddress[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipment_addresses")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as ShipmentAddress[];
}

export async function getShipmentEvents(
  shipmentId: string,
): Promise<ShipmentEvent[]> {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipment_events")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("event_time", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as ShipmentEvent[];
}

export async function getShippingMetrics(): Promise<ShipmentMetrics> {
  const shipments = await getShipments();
  const activeShipments = shipments.filter(
    (shipment) => shipment.shipment_status !== "cancelled",
  );
  const shippingCostCents = activeShipments.reduce(
    (total, shipment) => total + Math.round(shipment.shipping_cost * 100),
    0,
  );

  return {
    totalShipments: shipments.length,
    pending: shipments.filter((shipment) => shipment.shipment_status === "pending")
      .length,
    ready: shipments.filter((shipment) => shipment.shipment_status === "ready")
      .length,
    packed: shipments.filter((shipment) => shipment.shipment_status === "packed")
      .length,
    shipped: shipments.filter((shipment) => shipment.shipment_status === "shipped")
      .length,
    inTransit: shipments.filter(
      (shipment) => shipment.shipment_status === "in_transit",
    ).length,
    delivered: shipments.filter(
      (shipment) => shipment.shipment_status === "delivered",
    ).length,
    exceptions: shipments.filter(
      (shipment) => shipment.shipment_status === "exception",
    ).length,
    localPickup: shipments.filter(
      (shipment) => shipment.fulfillment_type === "local_pickup",
    ).length,
    averageShippingCost:
      activeShipments.length > 0
        ? shippingCostCents / activeShipments.length / 100
        : 0,
  };
}

async function getFulfilledQuantitiesByOrder(orderId: string) {
  if (!USE_SUPABASE || !supabase) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase
    .from("shipment_items")
    .select("order_item_id, quantity, shipment:shipments(order_id, shipment_status)")
    .eq("shipment.order_id", orderId);

  if (error) {
    return new Map<string, number>();
  }

  const fulfilled = new Map<string, number>();

  for (const row of data ?? []) {
    const shipment = Array.isArray(row.shipment)
      ? row.shipment[0]
      : row.shipment;

    if (!shipment || shipment.shipment_status === "cancelled") {
      continue;
    }

    fulfilled.set(
      row.order_item_id,
      (fulfilled.get(row.order_item_id) ?? 0) + Number(row.quantity ?? 0),
    );
  }

  return fulfilled;
}

export async function getFulfillableOrderItems(
  orderId: string,
): Promise<FulfillableOrderItem[]> {
  const [items, fulfilledQuantities] = await Promise.all([
    getOrderItems(orderId),
    getFulfilledQuantitiesByOrder(orderId),
  ]);

  return items.map((item) => {
    const alreadyFulfilled = fulfilledQuantities.get(item.id) ?? 0;

    return {
      ...item,
      already_fulfilled_quantity: alreadyFulfilled,
      remaining_fulfillable_quantity: Math.max(item.quantity - alreadyFulfilled, 0),
    };
  });
}

export async function getNextShipmentNumber() {
  if (!USE_SUPABASE || !supabase) {
    return "ASH-SHP-000001";
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("shipments")
      .select("shipment_number")
      .like("shipment_number", "ASH-SHP-%")
      .order("shipment_number", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const currentNumber = String(data?.[0]?.shipment_number ?? "");
    const match = currentNumber.match(/(\d+)$/);
    const nextNumber = (match ? Number(match[1]) : 0) + 1 + attempt;

    return `ASH-SHP-${String(nextNumber).padStart(6, "0")}`;
  }

  throw new Error("Unable to generate a shipment number.");
}

export async function getEligibleShippingOrders() {
  const orders = await getOrders();
  const eligible = [];

  for (const order of orders) {
    if (order.order_status === "cancelled") {
      continue;
    }

    const fulfillableItems = await getFulfillableOrderItems(order.id);

    if (
      fulfillableItems.some(
        (item) => item.remaining_fulfillable_quantity > 0,
      )
    ) {
      eligible.push(order);
    }
  }

  return eligible;
}

export async function getOrderFulfillmentSummary(orderId: string) {
  const items = await getFulfillableOrderItems(orderId);
  const totalOrdered = items.reduce((total, item) => total + item.quantity, 0);
  const totalFulfilled = items.reduce(
    (total, item) => total + item.already_fulfilled_quantity,
    0,
  );
  const shipments = await getShipmentsByOrder(orderId);
  const activeShipments = shipments.filter(
    (shipment) => shipment.shipment_status !== "cancelled",
  );

  if (activeShipments.some((shipment) => shipment.shipment_status === "ready")) {
    return "Local Pickup Ready";
  }

  if (activeShipments.some((shipment) => shipment.shipment_status === "delivered")) {
    return totalFulfilled >= totalOrdered ? "Delivered" : "Partially Fulfilled";
  }

  if (totalOrdered === 0 || totalFulfilled === 0) {
    return "Unfulfilled";
  }

  return totalFulfilled >= totalOrdered ? "Fulfilled" : "Partially Fulfilled";
}
