import type { PermissionKey } from "@/lib/staff/permissionTypes";
import { roleTemplates } from "@/lib/staff/roleTemplates";
import type { StaffRole } from "@/lib/staff/staffSession";

export type StaffModuleId =
  | "pos"
  | "orders"
  | "customers"
  | "inventory"
  | "shipping"
  | "returns"
  | "scheduling"
  | "timekeeper"
  | "my_schedule"
  | "availability"
  | "time_off"
  | "products"
  | "receiving"
  | "reports"
  | "staff_settings";

export type StaffModuleDefinition = {
  id: StaffModuleId;
  href: string;
  requiredPermissions: PermissionKey[];
  allowedRoles?: StaffRole[];
};

export const rolePermissions: Record<StaffRole, PermissionKey[]> = {
  owner: roleTemplates.owner.permissions,
  managing_partner: roleTemplates.managing_partner.permissions,
  store_manager: roleTemplates.store_manager.permissions,
  assistant_manager: roleTemplates.assistant_manager.permissions,
  manager: roleTemplates.manager.permissions,
  cashier: roleTemplates.cashier.permissions,
  inventory: roleTemplates.inventory.permissions,
  fulfillment: roleTemplates.fulfillment.permissions,
  customer_service: roleTemplates.customer_service.permissions,
  accounting: roleTemplates.accounting.permissions,
  marketing_ecommerce: roleTemplates.marketing_ecommerce.permissions,
};

export const staffModuleDefinitions: StaffModuleDefinition[] = [
  {
    id: "pos",
    href: "/admin/pos",
    requiredPermissions: ["pos.access"],
  },
  {
    id: "orders",
    href: "/admin/orders",
    requiredPermissions: ["orders.read"],
  },
  {
    id: "customers",
    href: "/admin/customers",
    requiredPermissions: ["customers.read"],
  },
  {
    id: "inventory",
    href: "/admin/inventory",
    requiredPermissions: ["inventory.read"],
  },
  {
    id: "shipping",
    href: "/admin/shipping",
    requiredPermissions: ["shipping.read"],
  },
  {
    id: "returns",
    href: "/admin/returns",
    requiredPermissions: ["returns.read"],
  },
  {
    id: "products",
    href: "/admin/products",
    requiredPermissions: ["products.read"],
  },
  {
    id: "receiving",
    href: "/admin/inventory/locations",
    requiredPermissions: ["inventory.locations.manage"],
  },
  {
    id: "reports",
    href: "/admin/analytics",
    requiredPermissions: ["reports.sales"],
  },
  {
    id: "staff_settings",
    href: "/admin/staff",
    requiredPermissions: ["staff.read"],
    allowedRoles: ["owner", "managing_partner"],
  },
];
