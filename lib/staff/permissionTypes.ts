export type StaffRole =
  | "owner"
  | "managing_partner"
  | "store_manager"
  | "assistant_manager"
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
  | "scheduling"
  | "timekeeper"
  | "payroll"
  | "returns"
  | "pos"
  | "reports"
  | "staff"
  | "audit"
  | "ownership"
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
  | "schedule.view_own"
  | "schedule.view_team"
  | "schedule.view_all"
  | "schedule.create"
  | "schedule.edit"
  | "schedule.publish"
  | "schedule.archive"
  | "schedule.manage_availability"
  | "schedule.manage_time_off"
  | "schedule.approve_time_off"
  | "schedule.override_conflicts"
  | "timekeeper.clock_self"
  | "timekeeper.view_own"
  | "timekeeper.view_team"
  | "timekeeper.view_all"
  | "timekeeper.correct_punch"
  | "timekeeper.add_missed_punch"
  | "timekeeper.review_timecard"
  | "timekeeper.approve_timecard"
  | "timekeeper.reopen_timecard"
  | "timekeeper.resolve_exception"
  | "timekeeper.manage_settings"
  | "timekeeper.export"
  | "payroll.view"
  | "payroll.manage"
  | "payroll.export"
  | "payroll.approve"
  | "payroll.close"
  | "payroll.reopen"
  | "payroll.generate_package"
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
  | "ownership.transfer"
  | "ownership.assign_owner"
  | "ownership.remove_last_owner"
  | "system.master_recovery"
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
  | "notifications.send"
  | "audit.read";

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
