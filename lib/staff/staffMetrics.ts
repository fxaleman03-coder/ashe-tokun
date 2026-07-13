import { getCustomerMetrics } from "@/lib/data/customersRepository";
import { getInventorySummary } from "@/lib/data/inventoryRepository";
import { getOrderSummaryMetrics } from "@/lib/data/ordersRepository";
import { getPosInventoryLocations, getPosProducts } from "@/lib/data/posRepository";
import { getProducts } from "@/lib/data/productsRepository";
import { getReturnMetrics } from "@/lib/data/returnsRepository";
import { getShippingMetrics } from "@/lib/data/shippingRepository";
import type { StaffModuleId } from "@/lib/staff/staffPermissions";

export type StaffMetricLabel =
  | "activeCustomers"
  | "activeOrders"
  | "awaitingApproval"
  | "available"
  | "buyingCustomers"
  | "catalogProducts"
  | "completed"
  | "completedTodayPending"
  | "customerLookupReady"
  | "fulfillmentReady"
  | "inStore"
  | "inStoreProducts"
  | "incomingUnits"
  | "inventoryReceivingFoundation"
  | "inTransit"
  | "lowStock"
  | "outOfStock"
  | "pinLoginPending"
  | "pendingTimeOffRequest"
  | "preparing"
  | "productLookupReady"
  | "registered"
  | "registerReady"
  | "reportsFoundation"
  | "requested"
  | "returnsReady"
  | "revenue"
  | "roleControlsPrepared"
  | "schedulePublishedStatus"
  | "schedulingReady"
  | "todayShift"
  | "nextScheduledShift"
  | "stockControlReady";

export type StaffMetricStatus = "operational" | "phase101" | "preview" | "ready";

export type StaffMetricLine = {
  value?: string | number;
  label: StaffMetricLabel;
};

export type StaffModuleMetric = {
  primary: StaffMetricLine;
  secondary: StaffMetricLine | { value: string; label?: never };
  status: StaffMetricStatus;
};

export type StaffCommandCenterMetrics = Record<StaffModuleId, StaffModuleMetric>;

async function safeMetric<T>(loader: () => Promise<T>): Promise<T | null> {
  try {
    return await loader();
  } catch {
    return null;
  }
}

function countLine(
  value: number | null | undefined,
  label: StaffMetricLabel,
  fallback: StaffMetricLabel,
): StaffMetricLine {
  if (typeof value !== "number") {
    return { label: fallback };
  }

  return { value, label };
}

export async function getStaffCommandCenterMetrics(): Promise<StaffCommandCenterMetrics> {
  const [
    posProducts,
    posLocations,
    orders,
    inventory,
    shipping,
    returns,
    customers,
    products,
  ] = await Promise.all([
    safeMetric(getPosProducts),
    safeMetric(getPosInventoryLocations),
    safeMetric(getOrderSummaryMetrics),
    safeMetric(getInventorySummary),
    safeMetric(getShippingMetrics),
    safeMetric(getReturnMetrics),
    safeMetric(getCustomerMetrics),
    safeMetric(getProducts),
  ]);

  const availableInStoreProducts = posProducts?.length ?? null;
  const defaultLocation =
    posLocations?.find((location) => location.code === "RETAIL-FLOOR") ??
    posLocations?.[0];

  return {
    pos: {
      primary: countLine(
        availableInStoreProducts,
        "inStoreProducts",
        "registerReady",
      ),
      secondary: defaultLocation?.name
        ? { value: defaultLocation.name }
        : { label: "registerReady" },
      status: "ready",
    },
    orders: {
      primary:
        orders === null
          ? { label: "completedTodayPending" }
          : {
              value:
                orders.totalOrders -
                orders.completedOrders -
                orders.cancelledOrders,
              label: "activeOrders",
            },
      secondary:
        orders === null
          ? { label: "completedTodayPending" }
          : { value: orders.completedOrders, label: "completed" },
      status: "operational",
    },
    customers: {
      primary: countLine(
        customers?.activeCustomers,
        "activeCustomers",
        "customerLookupReady",
      ),
      secondary:
        customers === null
          ? { label: "customerLookupReady" }
          : { value: customers.registeredCustomers, label: "registered" },
      status: "ready",
    },
    inventory: {
      primary: countLine(inventory?.lowStock, "lowStock", "stockControlReady"),
      secondary:
        inventory === null
          ? { label: "stockControlReady" }
          : { value: inventory.outOfStock, label: "outOfStock" },
      status: "operational",
    },
    shipping: {
      primary:
        shipping === null
          ? { label: "fulfillmentReady" }
          : {
              value: shipping.pending + shipping.ready + shipping.packed,
              label: "preparing",
            },
      secondary:
        shipping === null
          ? { label: "fulfillmentReady" }
          : { value: shipping.inTransit, label: "inTransit" },
      status: "operational",
    },
    returns: {
      primary: countLine(returns?.requestedReturns, "requested", "returnsReady"),
      secondary:
        returns === null
          ? { label: "returnsReady" }
          : { value: returns.approvedReturns, label: "awaitingApproval" },
      status: "operational",
    },
    scheduling: {
      primary: { label: "schedulingReady" },
      secondary: { label: "schedulePublishedStatus" },
      status: "ready",
    },
    my_schedule: {
      primary: { label: "todayShift" },
      secondary: { label: "nextScheduledShift" },
      status: "ready",
    },
    availability: {
      primary: { label: "schedulingReady" },
      secondary: { label: "schedulePublishedStatus" },
      status: "ready",
    },
    time_off: {
      primary: { label: "pendingTimeOffRequest" },
      secondary: { label: "schedulingReady" },
      status: "ready",
    },
    products: {
      primary: countLine(
        products?.length,
        "catalogProducts",
        "productLookupReady",
      ),
      secondary:
        products === null
          ? { label: "productLookupReady" }
          : {
              value: products.filter((product) => product.availableInStore)
                .length,
              label: "inStore",
            },
      status: "ready",
    },
    receiving: {
      primary:
        inventory === null
          ? { label: "inventoryReceivingFoundation" }
          : { value: inventory.incoming, label: "incomingUnits" },
      secondary: { label: "inventoryReceivingFoundation" },
      status: "ready",
    },
    reports: {
      primary:
        orders === null
          ? { label: "reportsFoundation" }
          : { value: `$${orders.totalRevenue.toFixed(2)}`, label: "revenue" },
      secondary:
        customers === null
          ? { label: "reportsFoundation" }
          : { value: customers.customersWithOrders, label: "buyingCustomers" },
      status: "preview",
    },
    staff_settings: {
      primary: { label: "pinLoginPending" },
      secondary: { label: "roleControlsPrepared" },
      status: "phase101",
    },
  };
}
