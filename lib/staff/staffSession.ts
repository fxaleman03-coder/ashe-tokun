import {
  rolePermissions,
  staffModuleDefinitions,
  type StaffModuleDefinition,
} from "@/lib/staff/staffPermissions";
import { hasPermission } from "@/lib/staff/permissionHelpers";
import type { PermissionKey, StaffRole } from "@/lib/staff/permissionTypes";

export type { PermissionKey as StaffPermission, StaffRole };

export type StaffLocationContext = {
  id: string;
  name: string;
  code: string;
};

export type StaffSession = {
  staffId: string;
  displayName: string;
  role: StaffRole;
  location: StaffLocationContext;
  employeeNumber: string;
  mustChangePin: boolean;
  authenticated: true;
};

export async function getCurrentStaffSession(): Promise<StaffSession | null> {
  const { getAuthenticatedStaffReadOnly } = await import("@/lib/staff/staffAuthService");

  return getAuthenticatedStaffReadOnly();
}

export function staffHasPermission(
  session: StaffSession,
  permission: PermissionKey,
) {
  return hasPermission(rolePermissions[session.role] ?? [], permission);
}

export function getAllowedStaffModules(
  session: StaffSession,
): StaffModuleDefinition[] {
  return staffModuleDefinitions.filter((moduleDefinition) =>
    moduleDefinition.requiredPermissions.every((permission) =>
      staffHasPermission(session, permission),
    ),
  );
}
