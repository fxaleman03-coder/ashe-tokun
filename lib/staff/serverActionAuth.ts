import "server-only";

import { getAuthenticatedStaffReadOnlyResult } from "@/lib/staff/staffAuthService";
import { getStaffAssignedPermissions } from "@/lib/staff/permissionGuard";
import { getEffectivePermissions, hasPermission } from "@/lib/staff/permissionHelpers";
import type { PermissionKey } from "@/lib/staff/permissionTypes";

type ServerActionAuthResult =
  | {
      ok: true;
      staffId: string;
      employeeNumber: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function requireServerActionPermission(
  required: PermissionKey | PermissionKey[],
): Promise<ServerActionAuthResult> {
  const sessionResult = await getAuthenticatedStaffReadOnlyResult();

  if (!sessionResult.ok) {
    return {
      ok: false,
      error:
        sessionResult.reason === "missing"
          ? "Authentication is required."
          : "Your staff session has expired. Please sign in again.",
    };
  }

  const staff = sessionResult.staff;

  if (staff.mustChangePin) {
    return {
      ok: false,
      error: "Please change your temporary PIN before making changes.",
    };
  }

  const assignments = await getStaffAssignedPermissions(staff.staffId);
  const permissions = getEffectivePermissions(staff.role, assignments);

  if (!hasPermission(permissions, required)) {
    return {
      ok: false,
      error: "Access denied.",
    };
  }

  return {
    ok: true,
    staffId: staff.staffId,
    employeeNumber: staff.employeeNumber,
  };
}
