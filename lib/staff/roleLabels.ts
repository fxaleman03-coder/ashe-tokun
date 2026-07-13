import type { StaffRole } from "@/lib/staff/permissionTypes";

export const staffRoleLabels: Record<StaffRole, string> = {
  owner: "Owner",
  managing_partner: "Managing Partner",
  store_manager: "Store Manager",
  assistant_manager: "Assistant Manager",
  manager: "Store Manager",
  cashier: "Cashier",
  inventory: "Inventory Specialist",
  fulfillment: "Shipping & Fulfillment",
  customer_service: "Customer Service",
  accounting: "Accounting",
  marketing_ecommerce: "Marketing & E-Commerce",
};

export const defaultBusinessTitles: Record<StaffRole, string> = {
  owner: "Owner",
  managing_partner: "Managing Partner",
  store_manager: "Store Manager",
  assistant_manager: "Assistant Manager",
  manager: "Store Manager",
  cashier: "Cashier",
  inventory: "Inventory Specialist",
  fulfillment: "Shipping & Fulfillment",
  customer_service: "Customer Service",
  accounting: "Accounting",
  marketing_ecommerce: "Marketing & E-Commerce",
};

export const executiveRoles: StaffRole[] = ["owner", "managing_partner"];

export function getSecurityRoleLabel(role: StaffRole) {
  return staffRoleLabels[role] ?? role;
}

export function getDefaultBusinessTitle(role: StaffRole) {
  return defaultBusinessTitles[role] ?? getSecurityRoleLabel(role);
}

export function getStaffBusinessTitle(
  role: StaffRole,
  businessTitle?: string | null,
) {
  return businessTitle?.trim() || getDefaultBusinessTitle(role);
}

export function isExecutiveRole(role: StaffRole) {
  return executiveRoles.includes(role);
}
