export type CustomerType = "walk_in" | "registered" | "wholesale" | "vip";

export type Customer = {
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
  display_name: string;
  order_count: number;
  lifetime_value: number;
  average_order_value: number;
  last_order_at: string | null;
};

export type CustomerAddressType = "billing" | "shipping" | "other";

export type CustomerAddress = {
  id: string;
  customer_id: string;
  address_type: CustomerAddressType;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  default_address: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerOrderSummary = {
  id: string;
  order_number: string;
  sales_channel: string;
  order_status: string;
  payment_status: string;
  grand_total: number;
  item_count: number;
  created_at: string;
};

export type CustomerMetrics = {
  totalCustomers: number;
  registeredCustomers: number;
  vipCustomers: number;
  wholesaleCustomers: number;
  walkInCustomers: number;
  activeCustomers: number;
  customersWithOrders: number;
  totalCustomerRevenue: number;
  averageCustomerValue: number;
};

export type CustomerFilters = {
  search?: string;
  customerType?: CustomerType | "all";
  activeStatus?: "all" | "active" | "inactive";
  orderStatus?: "all" | "with_orders" | "no_orders";
  minimumLifetimeValue?: number;
  maximumLifetimeValue?: number;
  lastOrderDate?: string;
};

export type CreateCustomerInput = {
  customer_type: CustomerType;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  active?: boolean;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type CreateCustomerAddressInput = {
  customer_id: string;
  address_type: CustomerAddressType;
  first_name?: string;
  last_name?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  default_address?: boolean;
};

export type UpdateCustomerAddressInput = Partial<
  Omit<CreateCustomerAddressInput, "customer_id">
>;
