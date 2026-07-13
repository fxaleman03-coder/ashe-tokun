import { permissions } from "@/lib/staff/permissions";
import { roleTemplates } from "@/lib/staff/roleTemplates";
import type {
  PermissionKey,
  StaffPermissionAssignment,
  StaffRole,
} from "@/lib/staff/permissionTypes";

export const permissionDefinitionsByKey = new Map(
  permissions.map((permission) => [permission.key, permission]),
);

export function getDefaultPermissionsForRole(role: StaffRole): PermissionKey[] {
  return roleTemplates[role]?.permissions ?? [];
}

export function getEffectivePermissions(
  role: StaffRole,
  assignments: StaffPermissionAssignment[] = [],
): PermissionKey[] {
  const effective = new Set(getDefaultPermissionsForRole(role));

  for (const assignment of assignments) {
    if (assignment.granted) {
      effective.add(assignment.permission_key);
    } else {
      effective.delete(assignment.permission_key);
    }
  }

  return Array.from(effective).sort();
}

export function hasPermission(
  permissionsToCheck: PermissionKey[],
  required: PermissionKey | PermissionKey[],
) {
  const granted = new Set(permissionsToCheck);
  const requiredPermissions = Array.isArray(required) ? required : [required];

  return requiredPermissions.every((permission) => granted.has(permission));
}

export function isOwnerCriticalPermission(permission: PermissionKey) {
  return permissionDefinitionsByKey.get(permission)?.ownerCritical === true;
}

export function isSensitivePermission(permission: PermissionKey) {
  return permissionDefinitionsByKey.get(permission)?.sensitive === true;
}

export function canRoleManageTargetRole(actorRole: StaffRole, targetRole: StaffRole) {
  if (actorRole === "owner") {
    return true;
  }

  if (actorRole === "managing_partner") {
    return targetRole !== "owner";
  }

  if (targetRole === "owner" || targetRole === "managing_partner") {
    return false;
  }

  return actorRole === "store_manager" || actorRole === "manager";
}

export function normalizePermissionAssignments(
  permissionKeys: string[],
): PermissionKey[] {
  const known = new Set(permissions.map((permission) => permission.key));

  return permissionKeys.filter((permission): permission is PermissionKey =>
    known.has(permission as PermissionKey),
  );
}
