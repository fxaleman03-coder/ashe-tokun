import "server-only";

import { getStaffAssignedPermissions } from "@/lib/staff/permissionGuard";
import { getEffectivePermissions, hasPermission } from "@/lib/staff/permissionHelpers";
import { getAuthenticatedStaffReadOnlyResult } from "@/lib/staff/staffAuthService";
import type { PermissionKey } from "@/lib/staff/permissionTypes";

export function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function requirePayrollRoutePermission(permission: PermissionKey) {
  const result = await getAuthenticatedStaffReadOnlyResult();

  if (!result.ok) {
    return { ok: false as const, response: textResponse("Staff session required.", 401) };
  }

  const assignments = await getStaffAssignedPermissions(result.staff.staffId);
  const permissions = getEffectivePermissions(result.staff.role, assignments);

  if (!hasPermission(permissions, permission)) {
    return { ok: false as const, response: textResponse("Access denied.", 403) };
  }

  return { ok: true as const, staff: result.staff };
}

export function bytesResponse(
  bytes: Uint8Array,
  headers: Record<string, string>,
) {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);

  return new Response(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

