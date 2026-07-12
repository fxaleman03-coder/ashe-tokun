import type { AdminOrderItem } from "@/lib/data/ordersRepository";

export type ShipmentStatus =
  | "pending"
  | "ready"
  | "packed"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "exception";

export type FulfillmentType = "shipping" | "local_pickup";

export type Shipment = {
  id: string;
  shipment_number: string;
  order_id: string;
  shipping_origin_id: string | null;
  shipping_origin_name: string | null;
  order_number: string | null;
  customer_id: string | null;
  customer: string;
  customer_contact: string | null;
  shipment_status: ShipmentStatus;
  fulfillment_type: FulfillmentType;
  carrier: string | null;
  service_level: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_cost: number;
  package_count: number;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  item_count: number;
};

export type ShipmentItem = {
  id: string;
  shipment_id: string;
  order_item_id: string;
  product_name: string;
  sku: string | null;
  brand_name: string | null;
  quantity: number;
  created_at: string;
};

export type ShipmentPackage = {
  id: string;
  shipment_id: string;
  package_number: string;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  weight_lb: number | null;
  package_type: string | null;
  label_url: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ShipmentAddressRole = "ship_from" | "ship_to";

export type ShipmentAddress = {
  id: string;
  shipment_id: string;
  address_role: ShipmentAddressRole;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export type ShipmentEvent = {
  id: string;
  shipment_id: string;
  event_type: string;
  status: ShipmentStatus;
  location: string | null;
  description: string | null;
  event_time: string;
  created_at: string;
};

export type FulfillableOrderItem = AdminOrderItem & {
  already_fulfilled_quantity: number;
  remaining_fulfillable_quantity: number;
};

export type ShipmentLineInput = {
  order_item_id: string;
  quantity: number;
};

export type PackageInput = {
  package_number?: string;
  length_in?: number | null;
  width_in?: number | null;
  height_in?: number | null;
  weight_lb?: number | null;
  package_type?: string | null;
  label_url?: string | null;
};

export type ShipmentAddressInput = {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  phone?: string | null;
  email?: string | null;
};

export type CreateShipmentInput = {
  order_id: string;
  fulfillment_type: FulfillmentType;
  shippingOriginId?: string | null;
  items: ShipmentLineInput[];
  ship_to?: ShipmentAddressInput | null;
  packages?: PackageInput[];
  carrier?: string | null;
  service_level?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipping_cost?: number;
  notes?: string | null;
};

export type UpdateShipmentInput = {
  shipment_status?: ShipmentStatus;
  carrier?: string | null;
  service_level?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipping_cost?: number;
  package_count?: number;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
};

export type AddTrackingInput = {
  carrier: string;
  service_level?: string | null;
  tracking_number: string;
  tracking_url?: string | null;
  shipped_at?: string | null;
};

export type ShipmentFilters = {
  search?: string;
  orderNumber?: string;
  customer?: string;
  shipmentStatus?: string;
  fulfillmentType?: string;
  carrier?: string;
  shippingOrigin?: string;
  trackingNumber?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ShipmentMetrics = {
  totalShipments: number;
  pending: number;
  ready: number;
  packed: number;
  shipped: number;
  inTransit: number;
  delivered: number;
  exceptions: number;
  localPickup: number;
  averageShippingCost: number;
};

export type ShippingMutationResult =
  | {
      ok: true;
      message: string;
      shipmentId?: string;
      shipmentNumber?: string;
    }
  | {
      ok: false;
      error: string;
      critical?: boolean;
      shipmentId?: string;
    };
