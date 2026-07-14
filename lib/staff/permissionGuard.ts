import "server-only";

import { forbidden, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getEffectivePermissions, hasPermission } from "@/lib/staff/permissionHelpers";
import type {
  PermissionKey,
  StaffPermissionAssignment,
} from "@/lib/staff/permissionTypes";
import { getAuthenticatedStaffReadOnlyResult } from "@/lib/staff/staffAuthService";

type StaffPermissionRow = {
  permission_key: PermissionKey;
  granted: boolean;
};

type AdminRoutePermission = {
  path: string;
  permissions: PermissionKey[];
};

export const adminRoutePermissions: AdminRoutePermission[] = [
  { path: "/admin/products/new", permissions: ["products.create"] },
  { path: "/admin/products", permissions: ["products.read"] },
  { path: "/admin/catalog", permissions: ["products.read"] },
  { path: "/admin/categories", permissions: ["products.read"] },
  { path: "/admin/collections", permissions: ["products.read"] },
  { path: "/admin/product-types", permissions: ["products.read"] },
  { path: "/admin/traditions", permissions: ["products.read"] },
  { path: "/admin/vendors", permissions: ["vendors.read"] },
  { path: "/admin/media", permissions: ["products.read"] },
  { path: "/admin/pos", permissions: ["pos.access"] },
  { path: "/admin/inventory/locations", permissions: ["inventory.locations.manage"] },
  { path: "/admin/inventory", permissions: ["inventory.read"] },
  { path: "/admin/orders", permissions: ["orders.read"] },
  { path: "/admin/shipping/new", permissions: ["shipping.create"] },
  { path: "/admin/shipping", permissions: ["shipping.read"] },
  { path: "/admin/scheduling/new", permissions: ["schedule.create"] },
  { path: "/admin/scheduling/availability", permissions: ["schedule.manage_availability"] },
  { path: "/admin/scheduling/time-off", permissions: ["schedule.approve_time_off"] },
  { path: "/admin/scheduling", permissions: ["schedule.view_all"] },
  { path: "/admin/timekeeper", permissions: ["timekeeper.view_all"] },
  { path: "/admin/returns/new", permissions: ["returns.create"] },
  { path: "/admin/returns", permissions: ["returns.read"] },
  { path: "/admin/customers/new", permissions: ["customers.create"] },
  { path: "/admin/customers", permissions: ["customers.read"] },
  { path: "/admin/analytics", permissions: ["reports.sales"] },
  { path: "/admin/settings/shipping-origins", permissions: ["shipping.origins.manage"] },
  { path: "/admin/settings", permissions: ["settings.company"] },
  { path: "/admin/staff/new", permissions: ["staff.create"] },
  { path: "/admin/staff", permissions: ["staff.read"] },
  { path: "/admin/database", permissions: ["settings.security"] },
  { path: "/admin", permissions: ["reports.sales"] },
];

export function getRequiredPermissionsForAdminPath(pathname: string) {
  return adminRoutePermissions
    .filter(
      (route) =>
        pathname === route.path || pathname.startsWith(`${route.path}/`),
    )
    .sort((first, second) => second.path.length - first.path.length)[0]
    ?.permissions;
}

export async function getStaffAssignedPermissions(staffId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return [] satisfies StaffPermissionAssignment[];
  }

  const { data, error } = await supabase
    .from("staff_permission_assignments")
    .select("permission_key, granted")
    .eq("staff_member_id", staffId);

  if (error || !data) {
    return [] satisfies StaffPermissionAssignment[];
  }

  return (data as StaffPermissionRow[]).map((row) => ({
    permission_key: row.permission_key,
    granted: row.granted,
  }));
}

export async function getEffectivePermissionsForStaff(staffId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("staff_members")
    .select("id, role")
    .eq("id", staffId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const assignments = await getStaffAssignedPermissions(staffId);

  return getEffectivePermissions(data.role, assignments);
}

export async function getCurrentStaffPermissions() {
  const result = await getAuthenticatedStaffReadOnlyResult();

  if (!result.ok) {
    return null;
  }

  const staff = result.staff;
  const assignments = await getStaffAssignedPermissions(staff.staffId);

  return getEffectivePermissions(staff.role, assignments);
}

export async function requirePermission(required: PermissionKey | PermissionKey[]) {
  const result = await getAuthenticatedStaffReadOnlyResult();

  if (!result.ok) {
    redirect(
      result.reason === "missing"
        ? "/staff/login?status=session_required"
        : "/staff/login?status=session_expired",
    );
  }

  const staff = result.staff;

  if (staff.mustChangePin) {
    redirect("/staff/change-pin");
  }

  const assignments = await getStaffAssignedPermissions(staff.staffId);
  const permissions = getEffectivePermissions(staff.role, assignments);

  if (!hasPermission(permissions, required)) {
    forbidden();
  }

  return { staff, permissions };
}

export async function requireAdminRouteAccess(pathname?: string) {
  const headerStore = await headers();
  const adminPathname = pathname ?? headerStore.get("x-ashe-pathname") ?? "/admin";
  const requiredPermissions = getRequiredPermissionsForAdminPath(adminPathname) ?? [
    "settings.security",
  ];

  return requirePermission(requiredPermissions);
}
