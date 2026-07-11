import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import type {
  Customer,
  CustomerAddress,
  CustomerFilters,
  CustomerMetrics,
  CustomerOrderSummary,
  CustomerType,
} from "@/lib/types/customer";
import { getCustomerPrimaryName } from "@/lib/utils/customerDisplay";

type CustomerRow = {
  id: string;
  customer_number: string;
  customer_type: CustomerType;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type CustomerOrderRow = {
  id: string;
  customer_id: string | null;
  order_number: string;
  sales_channel: string;
  order_status: string;
  payment_status: string;
  grand_total: number | string | null;
  created_at: string;
  order_items?: { id: string }[] | null;
};

const localWalkInCustomer: Customer = {
  id: "local-walk-in-customer",
  customer_number: "CUST-WALK-IN",
  customer_type: "walk_in",
  first_name: "Walk-in",
  last_name: "Customer",
  company_name: null,
  email: null,
  phone: null,
  notes: "Default customer record for anonymous physical store sales.",
  active: true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
  display_name: "Walk-in Customer",
  order_count: 0,
  lifetime_value: 0,
  average_order_value: 0,
  last_order_at: null,
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function getCustomerDisplayName(
  customer: Pick<CustomerRow, "first_name" | "last_name" | "company_name">,
) {
  return getCustomerPrimaryName(customer) || "Walk-in Customer";
}

function normalizeCustomer(row: CustomerRow, orders: CustomerOrderRow[]): Customer {
  const customerOrders = orders.filter(
    (order) =>
      order.customer_id === row.id && order.order_status !== "cancelled",
  );
  const lifetimeValueCents = customerOrders.reduce(
    (total, order) => total + Math.round(toNumber(order.grand_total) * 100),
    0,
  );
  const lastOrder = customerOrders
    .toSorted(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime(),
    )
    .at(0);

  return {
    ...row,
    display_name: getCustomerDisplayName(row),
    order_count: customerOrders.length,
    lifetime_value: lifetimeValueCents / 100,
    average_order_value:
      customerOrders.length > 0
        ? lifetimeValueCents / customerOrders.length / 100
        : 0,
    last_order_at: lastOrder?.created_at ?? null,
  };
}

function applyCustomerFilters(customers: Customer[], filters?: CustomerFilters) {
  if (!filters) {
    return customers;
  }

  const search = filters.search?.trim().toLowerCase();
  const lastOrderDate = filters.lastOrderDate
    ? new Date(filters.lastOrderDate)
    : null;

  return customers.filter((customer) => {
    const searchable = [
      customer.display_name,
      customer.customer_number,
      customer.email,
      customer.phone,
      customer.company_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !search || searchable.includes(search);
    const matchesType =
      !filters.customerType ||
      filters.customerType === "all" ||
      customer.customer_type === filters.customerType;
    const matchesActive =
      !filters.activeStatus ||
      filters.activeStatus === "all" ||
      (filters.activeStatus === "active" ? customer.active : !customer.active);
    const matchesOrders =
      !filters.orderStatus ||
      filters.orderStatus === "all" ||
      (filters.orderStatus === "with_orders"
        ? customer.order_count > 0
        : customer.order_count === 0);
    const matchesMinimum =
      filters.minimumLifetimeValue === undefined ||
      customer.lifetime_value >= filters.minimumLifetimeValue;
    const matchesMaximum =
      filters.maximumLifetimeValue === undefined ||
      customer.lifetime_value <= filters.maximumLifetimeValue;
    const matchesLastOrder =
      !lastOrderDate ||
      (customer.last_order_at &&
        new Date(customer.last_order_at) >= lastOrderDate);

    return (
      matchesSearch &&
      matchesType &&
      matchesActive &&
      matchesOrders &&
      matchesMinimum &&
      matchesMaximum &&
      matchesLastOrder
    );
  });
}

async function readCustomerRows() {
  if (!USE_SUPABASE || !supabase) {
    return [localWalkInCustomer];
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.info("[ASHE TOKUN customers repository]", "Customer read failed.", {
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return [localWalkInCustomer];
  }

  return (data ?? []) as CustomerRow[];
}

async function readCustomerOrderRows() {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        customer_id,
        order_number,
        sales_channel,
        order_status,
        payment_status,
        grand_total,
        created_at,
        order_items(id)
      `,
    )
    .not("customer_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.info(
      "[ASHE TOKUN customers repository]",
      "Customer order summary read failed.",
      {
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
      },
    );

    return [];
  }

  return (data ?? []) as CustomerOrderRow[];
}

export async function getCustomers(filters?: CustomerFilters) {
  const [customers, orders] = await Promise.all([
    readCustomerRows(),
    readCustomerOrderRows(),
  ]);

  return applyCustomerFilters(
    customers.map((customer) => normalizeCustomer(customer, orders)),
    filters,
  );
}

export async function getCustomerById(customerId: string) {
  const customers = await getCustomers();

  return customers.find((customer) => customer.id === customerId) ?? null;
}

export async function getCustomerByNumber(customerNumber: string) {
  const customers = await getCustomers();
  const normalizedNumber = customerNumber.trim().toLowerCase();

  return (
    customers.find(
      (customer) =>
        customer.customer_number.toLowerCase() === normalizedNumber,
    ) ?? null
  );
}

export async function getCustomerByEmail(email: string) {
  const customers = await getCustomers();
  const normalizedEmail = email.trim().toLowerCase();

  return (
    customers.find(
      (customer) => customer.email?.toLowerCase() === normalizedEmail,
    ) ?? null
  );
}

export async function getCustomerAddresses(customerId: string) {
  if (!USE_SUPABASE || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", customerId)
    .order("default_address", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.info("[ASHE TOKUN customers repository]", "Address read failed.", {
      customerId,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return [];
  }

  return (data ?? []) as CustomerAddress[];
}

export async function getCustomerOrders(customerId: string) {
  const orders = await readCustomerOrderRows();

  return orders
    .filter((order) => order.customer_id === customerId)
    .map<CustomerOrderSummary>((order) => ({
      id: order.id,
      order_number: order.order_number,
      sales_channel: order.sales_channel,
      order_status: order.order_status,
      payment_status: order.payment_status,
      grand_total: toNumber(order.grand_total),
      item_count: order.order_items?.length ?? 0,
      created_at: order.created_at,
    }));
}

export async function getCustomerMetrics(): Promise<CustomerMetrics> {
  const customers = await getCustomers();
  const realCustomers = customers.filter(
    (customer) => customer.customer_type !== "walk_in",
  );
  const totalRevenueCents = customers.reduce(
    (total, customer) => total + Math.round(customer.lifetime_value * 100),
    0,
  );
  const customersWithOrders = customers.filter(
    (customer) => customer.order_count > 0,
  ).length;

  return {
    totalCustomers: customers.length,
    registeredCustomers: customers.filter(
      (customer) => customer.customer_type === "registered",
    ).length,
    vipCustomers: customers.filter((customer) => customer.customer_type === "vip")
      .length,
    wholesaleCustomers: customers.filter(
      (customer) => customer.customer_type === "wholesale",
    ).length,
    walkInCustomers: customers.filter(
      (customer) => customer.customer_type === "walk_in",
    ).length,
    activeCustomers: customers.filter((customer) => customer.active).length,
    customersWithOrders,
    totalCustomerRevenue: totalRevenueCents / 100,
    averageCustomerValue:
      realCustomers.length > 0 ? totalRevenueCents / realCustomers.length / 100 : 0,
  };
}

export async function getWalkInCustomer() {
  return (
    (await getCustomerByNumber("CUST-WALK-IN")) ??
    (await getCustomerByNumber("ASH-WALK-IN")) ??
    localWalkInCustomer
  );
}
