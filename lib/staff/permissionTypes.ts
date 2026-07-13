export type StaffRole =
  | "owner"
  | "manager"
  | "cashier"
  | "inventory"
  | "fulfillment"
  | "customer_service"
  | "accounting"
  | "marketing_ecommerce";

export type PermissionGroupId =
  | "products"
  | "inventory"
  | "orders"
  | "customers"
  | "shipping"
  | "returns"
  | "pos"
  | "reports"
  | "staff"
  | "settings"
  | "accounting"
  | "vendors"
  | "gift_cards"
  | "store_credit"
  | "notifications";

export type PermissionKey =
  | "products.read"
  | "products.create"
  | "products.edit"
  | "products.archive"
  | "products.cost.read"
  | "inventory.read"
  | "inventory.adjust"
  | "inventory.transfer"
  | "inventory.locations.manage"
  | "orders.read"
  | "orders.edit"
  | "orders.cancel"
  | "orders.refund"
  | "customers.read"
  | "customers.create"
  | "customers.edit"
  | "shipping.read"
  | "shipping.create"
  | "shipping.edit"
  | "shipping.origins.manage"
  | "returns.read"
  | "returns.create"
  | "returns.approve"
  | "returns.complete"
  | "pos.access"
  | "pos.checkout"
  | "reports.sales"
  | "reports.inventory"
  | "staff.read"
  | "staff.create"
  | "staff.edit"
  | "staff.reset_pin"
  | "staff.permissions.manage"
  | "settings.company"
  | "settings.security"
  | "accounting.read"
  | "accounting.refunds"
  | "vendors.read"
  | "vendors.edit"
  | "gift_cards.read"
  | "gift_cards.issue"
  | "store_credit.read"
  | "store_credit.issue"
  | "notifications.read"
  | "notifications.send";

export type StaffPermissionAssignment = {
  permission_key: PermissionKey;
  granted: boolean;
};

export type PermissionDefinition = {
  key: PermissionKey;
  group: PermissionGroupId;
  label: string;
  description: string;
  sensitive?: boolean;
  ownerCritical?: boolean;
};

export type PermissionGroupDefinition = {
  id: PermissionGroupId;
  label: string;
  description: string;
};
