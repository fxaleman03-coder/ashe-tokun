import type { PermissionGroupDefinition } from "@/lib/staff/permissionTypes";

export const permissionGroups: PermissionGroupDefinition[] = [
  {
    id: "products",
    label: "Products",
    description: "Catalog records, pricing, product status, and cost visibility.",
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock visibility, adjustments, transfers, and locations.",
  },
  {
    id: "orders",
    label: "Orders",
    description: "Order review, status changes, cancellations, and refunds.",
  },
  {
    id: "customers",
    label: "Customers",
    description: "Customer lookup, service notes, and profile management.",
  },
  {
    id: "shipping",
    label: "Shipping",
    description: "Shipment creation, fulfillment, origins, and tracking.",
  },
  {
    id: "scheduling",
    label: "Scheduling",
    description: "Employee schedules, availability, time off, and shift coverage.",
  },
  {
    id: "timekeeper",
    label: "Timekeeper",
    description: "Actual punches, timecards, attendance exceptions, and review.",
  },
  {
    id: "payroll",
    label: "Payroll",
    description: "Pay periods, approved timecard aggregation, and payroll exports.",
  },
  {
    id: "returns",
    label: "Returns",
    description: "Return creation, approvals, receiving, and completion.",
  },
  {
    id: "pos",
    label: "POS",
    description: "Register access and in-store checkout workflows.",
  },
  {
    id: "reports",
    label: "Reports",
    description: "Sales, operational, and inventory reporting.",
  },
  {
    id: "staff",
    label: "Staff",
    description: "Employee records, PIN resets, sessions, and permissions.",
  },
  {
    id: "audit",
    label: "Audit",
    description: "Operational, staff, and security audit review.",
  },
  {
    id: "ownership",
    label: "Ownership Governance",
    description:
      "Reserved legal ownership, partner assignment, and master recovery controls.",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Company settings and security configuration.",
  },
  {
    id: "accounting",
    label: "Accounting",
    description: "Financial review, refunds, and accounting workflows.",
  },
  {
    id: "vendors",
    label: "Vendors",
    description: "Customer-facing brands, suppliers, and vendor records.",
  },
  {
    id: "gift_cards",
    label: "Gift Cards",
    description: "Gift card lookup and issue workflows.",
  },
  {
    id: "store_credit",
    label: "Store Credit",
    description: "Store credit review and issue workflows.",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Customer and operational notification workflows.",
  },
];
