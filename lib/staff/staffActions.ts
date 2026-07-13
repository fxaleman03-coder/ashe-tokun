"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { permissions } from "@/lib/staff/permissions";
import {
  canRoleManageTargetRole,
  getDefaultPermissionsForRole,
  isOwnerCriticalPermission,
  normalizePermissionAssignments,
} from "@/lib/staff/permissionHelpers";
import { getDefaultBusinessTitle } from "@/lib/staff/roleLabels";
import { requirePermission } from "@/lib/staff/permissionGuard";
import { hashPin, validatePinFormat } from "@/lib/staff/pinSecurity";
import {
  archiveStaffMember,
  authenticateStaff,
  changeOwnPin,
  deactivateStaffMember,
  logoutCurrentStaff,
  reactivateStaffMember,
  resetStaffPinAsOwner,
  revokeStaffSessions,
  unlockStaffAccount,
} from "@/lib/staff/staffAuthService";
import type { StaffRole } from "@/lib/staff/staffSession";
import type { StaffEmploymentStatus } from "@/lib/types/staff";

const editableStaffRoles: StaffRole[] = [
  "owner",
  "managing_partner",
  "store_manager",
  "assistant_manager",
  "manager",
  "cashier",
  "inventory",
  "fulfillment",
  "customer_service",
  "accounting",
  "marketing_ecommerce",
];

const editableEmploymentStatuses: StaffEmploymentStatus[] = [
  "active",
  "on_leave",
  "resigned",
  "terminated",
  "retired",
  "archived",
];

export type StaffActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

type StaffProfileSpecificAudit = {
  action: string;
  previous: string | boolean | null;
  next: string | boolean | null;
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeEmployeeNumber(employeeNumber: string) {
  return employeeNumber.trim().toUpperCase();
}

async function writePermissionAudit(input: {
  actorId: string;
  staffMemberId: string;
  action: string;
  details: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  await supabase.from("audit_logs").insert({
    staff_user_id: input.actorId,
    action: input.action,
    entity_type: "staff_permission",
    entity_id: input.staffMemberId,
    details: input.details,
  });
}

async function writeStaffProfileAudit(input: {
  actorId: string;
  staffMemberId: string;
  action: string;
  details: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  await supabase.from("audit_logs").insert({
    staff_user_id: input.actorId,
    action: input.action,
    entity_type: "staff",
    entity_id: input.staffMemberId,
    details: input.details,
  });
}

async function getTargetStaffForPermissionChange(staffMemberId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("staff_members")
    .select("id, employee_number, role, active, employment_status")
    .eq("id", staffMemberId)
    .maybeSingle();

  return data as {
    id: string;
    employee_number: string;
    role: StaffRole;
    active: boolean;
    employment_status: StaffEmploymentStatus;
  } | null;
}

async function getTargetStaffForProfileUpdate(staffMemberId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const selectWithBusinessTitle =
    "id, employee_number, first_name, last_name, display_name, business_title, role, active, assigned_location_id, employment_status";
  const legacySelect =
    "id, employee_number, first_name, last_name, display_name, role, active, assigned_location_id, employment_status";

  const result = await supabase
    .from("staff_members")
    .select(selectWithBusinessTitle)
    .eq("id", staffMemberId)
    .maybeSingle();

  const missingBusinessTitle =
    result.error?.code === "42703" ||
    result.error?.message.includes("business_title");
  const { data } = missingBusinessTitle
    ? await supabase
        .from("staff_members")
        .select(legacySelect)
        .eq("id", staffMemberId)
        .maybeSingle()
    : result;

  if (!data) {
    return null;
  }

  return {
    ...(data as {
      id: string;
      employee_number: string;
      first_name: string;
      last_name: string;
      display_name: string | null;
      business_title?: string | null;
      role: StaffRole;
      active: boolean;
      assigned_location_id: string | null;
      employment_status: StaffEmploymentStatus;
    }),
    businessTitleColumnAvailable: !missingBusinessTitle,
  };
}

async function isFinalActiveOwner(staffMemberId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return false;
  }

  const { data } = await supabase
    .from("staff_members")
    .select("id")
    .eq("role", "owner")
    .eq("active", true)
    .eq("employment_status", "active");

  const activeOwnerIds = (data ?? []).map((row) => row.id);

  return activeOwnerIds.length === 1 && activeOwnerIds[0] === staffMemberId;
}

function getSubmittedPermissions(formData: FormData) {
  const submitted = permissions
    .filter((permission) => formData.get(`permission:${permission.key}`) === "on")
    .map((permission) => permission.key);

  return normalizePermissionAssignments(submitted);
}

export async function loginStaffAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const result = await authenticateStaff(
    getString(formData, "employeeNumber"),
    getString(formData, "pin"),
  );

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

  redirect(result.redirectTo);
}

export async function logoutStaffAction() {
  await logoutCurrentStaff();
  redirect("/staff/login?status=logged_out");
}

export async function changePinAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const currentPin = getString(formData, "currentPin");
  const newPin = getString(formData, "newPin");
  const confirmPin = getString(formData, "confirmPin");

  if (newPin !== confirmPin) {
    return { status: "error", message: "New PIN confirmation does not match." };
  }

  const result = await changeOwnPin(currentPin, newPin);

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  redirect("/staff");
}

export async function createStaffMemberAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const { staff: actor } = await requirePermission("staff.create");
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "error", message: "Staff management is not configured." };
  }

  const employeeNumber = normalizeEmployeeNumber(getString(formData, "employeeNumber"));
  const temporaryPin = getString(formData, "temporaryPin");
  const confirmTemporaryPin = getString(formData, "confirmTemporaryPin");
  const role = getString(formData, "role") as StaffRole;

  if (!editableStaffRoles.includes(role)) {
    return { status: "error", message: "Selected role is not valid." };
  }

  if (temporaryPin !== confirmTemporaryPin) {
    return { status: "error", message: "Temporary PIN confirmation does not match." };
  }

  if (
    ["manager", "store_manager", "assistant_manager"].includes(actor.role) &&
    (role === "owner" || role === "managing_partner")
  ) {
    return { status: "error", message: "Managers cannot create executive accounts." };
  }

  if (actor.role === "managing_partner" && role === "owner") {
    return {
      status: "error",
      message: "Managing Partners cannot create Owner accounts.",
    };
  }

  const validation = validatePinFormat(temporaryPin, employeeNumber);

  if (!validation.valid) {
    return { status: "error", message: validation.error };
  }

  const { data: existing } = await supabase
    .from("staff_members")
    .select("id")
    .eq("employee_number", employeeNumber)
    .maybeSingle();

  if (existing) {
    return { status: "error", message: "Employee number already exists." };
  }

  const { data, error } = await supabase
    .from("staff_members")
    .insert({
      employee_number: employeeNumber,
      first_name: getString(formData, "firstName"),
      last_name: getString(formData, "lastName"),
      display_name: getString(formData, "displayName") || null,
      role,
      assigned_location_id: getString(formData, "assignedLocationId") || null,
      pin_hash: await hashPin(temporaryPin),
      active: formData.get("active") === "on",
      employment_status: "active",
      must_change_pin: true,
      created_by_staff_id: actor.staffId,
      updated_by_staff_id: actor.staffId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: "Staff member could not be created." };
  }

  await supabase.from("staff_auth_events").insert({
    staff_member_id: data.id,
    employee_number: employeeNumber,
    event_type: "pin_reset",
    success: true,
    failure_reason: "temporary_pin_created",
  });

  await supabase.from("audit_logs").insert({
    staff_user_id: actor.staffId,
    action: "staff_created",
    entity_type: "staff",
    entity_id: data.id,
    details: { role },
  });

  revalidatePath("/admin/staff");
  redirect(`/admin/staff/${data.id}`);
}

export async function updateStaffMemberProfileAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const { staff: actor } = await requirePermission("staff.edit");
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "error", message: "Staff management is not configured." };
  }

  const staffMemberId = getString(formData, "staffMemberId");
  const target = await getTargetStaffForProfileUpdate(staffMemberId);

  if (!target) {
    return { status: "error", message: "Employee was not found." };
  }

  if (!canRoleManageTargetRole(actor.role, target.role)) {
    return { status: "error", message: "You cannot modify this employee." };
  }

  const role = getString(formData, "role") as StaffRole;
  const employmentStatus = getString(formData, "employmentStatus") as StaffEmploymentStatus;
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const displayName = getString(formData, "displayName") || null;
  const businessTitle =
    getString(formData, "businessTitle") || getDefaultBusinessTitle(role);
  const assignedLocationId = getString(formData, "assignedLocationId") || null;
  const active = formData.get("active") === "on";

  if (!firstName || !lastName) {
    return { status: "error", message: "First and last name are required." };
  }

  if (!editableStaffRoles.includes(role)) {
    return { status: "error", message: "Selected role is not valid." };
  }

  if (!editableEmploymentStatuses.includes(employmentStatus)) {
    return { status: "error", message: "Selected employment status is not valid." };
  }

  const targetIsExecutive =
    target.role === "owner" || target.role === "managing_partner";
  const submittedRoleIsExecutive = role === "owner" || role === "managing_partner";

  if (
    ["manager", "store_manager", "assistant_manager"].includes(actor.role) &&
    (targetIsExecutive || submittedRoleIsExecutive)
  ) {
    return {
      status: "error",
      message: "Managers cannot modify or assign executive roles.",
    };
  }

  if (actor.role === "managing_partner" && (target.role === "owner" || role === "owner")) {
    return {
      status: "error",
      message: "Managing Partners cannot modify or assign Owner roles.",
    };
  }

  if (assignedLocationId) {
    const { data: location } = await supabase
      .from("inventory_locations")
      .select("id")
      .eq("id", assignedLocationId)
      .maybeSingle();

    if (!location) {
      return { status: "error", message: "Assigned location was not found." };
    }
  }

  const finalOwner = target.role === "owner" && (await isFinalActiveOwner(target.id));
  if (finalOwner && role !== "owner") {
    return { status: "error", message: "The final active Owner cannot lose the Owner role." };
  }
  if (finalOwner && (!active || employmentStatus !== "active")) {
    return { status: "error", message: "The final active Owner cannot be deactivated or archived." };
  }

  const updatePayload = {
    first_name: firstName,
    last_name: lastName,
    display_name: displayName,
    ...(target.businessTitleColumnAvailable
      ? { business_title: businessTitle }
      : {}),
    role,
    assigned_location_id: assignedLocationId,
    active,
    employment_status: employmentStatus,
    updated_by_staff_id: actor.staffId,
  };
  const previousValues = {
    first_name: target.first_name,
    last_name: target.last_name,
    display_name: target.display_name,
    ...(target.businessTitleColumnAvailable
      ? {
          business_title:
            target.business_title ?? getDefaultBusinessTitle(target.role),
        }
      : {}),
    role: target.role,
    assigned_location_id: target.assigned_location_id,
    active: target.active,
    employment_status: target.employment_status,
  };
  const changedFields = Object.entries(updatePayload)
    .filter(([key, value]) => key !== "updated_by_staff_id" && previousValues[key as keyof typeof previousValues] !== value)
    .map(([key]) => key);

  if (changedFields.length === 0) {
    return { status: "success", message: "No profile changes were needed." };
  }

  const { data, error } = await supabase
    .from("staff_members")
    .update(updatePayload)
    .eq("id", target.id)
    .select(
      target.businessTitleColumnAvailable
        ? "id, employee_number, first_name, last_name, display_name, business_title, role, assigned_location_id, active, employment_status"
        : "id, employee_number, first_name, last_name, display_name, role, assigned_location_id, active, employment_status",
    )
    .single();

  if (error || !data) {
    return { status: "error", message: "Employee profile could not be updated." };
  }

  const updatedStaff = data as unknown as {
    id: string;
    employee_number: string;
    first_name: string;
    last_name: string;
    display_name: string | null;
    business_title?: string | null;
    role: StaffRole;
    assigned_location_id: string | null;
    active: boolean;
    employment_status: StaffEmploymentStatus;
  };
  const newValues = {
    first_name: updatedStaff.first_name,
    last_name: updatedStaff.last_name,
    display_name: updatedStaff.display_name,
    ...(target.businessTitleColumnAvailable
      ? {
          business_title:
            updatedStaff.business_title ??
            getDefaultBusinessTitle(updatedStaff.role),
        }
      : {}),
    role: updatedStaff.role,
    assigned_location_id: updatedStaff.assigned_location_id,
    active: updatedStaff.active,
    employment_status: updatedStaff.employment_status,
  };

  await writeStaffProfileAudit({
    actorId: actor.staffId,
    staffMemberId: target.id,
    action: "staff_profile_updated",
    details: {
      employee_number: target.employee_number,
      changed_fields: changedFields,
      previous: previousValues,
      next: newValues,
      changed_by: actor.employeeNumber,
    },
  });

  const previousBusinessTitle =
    target.business_title ?? getDefaultBusinessTitle(target.role);
  const nextBusinessTitle =
    updatedStaff.business_title ?? getDefaultBusinessTitle(updatedStaff.role);
  const specificAuditActions: Array<StaffProfileSpecificAudit | null> = [
    target.businessTitleColumnAvailable &&
    previousBusinessTitle !== nextBusinessTitle
      ? {
          action: "staff_business_title_changed",
          previous: previousBusinessTitle,
          next: nextBusinessTitle,
        }
      : null,
    target.role !== updatedStaff.role
      ? {
          action: "staff_security_role_changed",
          previous: target.role,
          next: updatedStaff.role,
        }
      : null,
    target.assigned_location_id !== updatedStaff.assigned_location_id
      ? {
          action: "location_changed",
          previous: target.assigned_location_id,
          next: updatedStaff.assigned_location_id,
        }
      : null,
    target.employment_status !== updatedStaff.employment_status
      ? {
          action: "employment_status_changed",
          previous: target.employment_status,
          next: updatedStaff.employment_status,
        }
      : null,
    target.active && !updatedStaff.active
      ? { action: "staff_deactivated", previous: true, next: false }
      : null,
    !target.active && updatedStaff.active
      ? { action: "staff_reactivated", previous: false, next: true }
      : null,
  ];

  for (const audit of specificAuditActions.filter(
    (entry): entry is StaffProfileSpecificAudit => Boolean(entry),
  )) {
    await writeStaffProfileAudit({
      actorId: actor.staffId,
      staffMemberId: target.id,
      action: audit.action,
      details: {
        actor_staff_id: actor.staffId,
        target_staff_id: target.id,
        employee_number: target.employee_number,
        changed_by: actor.employeeNumber,
        previous: audit.previous,
        next: audit.next,
      },
    });
  }

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${target.id}`);
  redirect(`/admin/staff/${target.id}`);
}

export async function resetStaffPinAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  await requirePermission("staff.reset_pin");
  const staffMemberId = getString(formData, "staffMemberId");
  const temporaryPin = getString(formData, "temporaryPin");
  const confirmTemporaryPin = getString(formData, "confirmTemporaryPin");

  if (temporaryPin !== confirmTemporaryPin) {
    return { status: "error", message: "Temporary PIN confirmation does not match." };
  }

  const result = await resetStaffPinAsOwner(staffMemberId, temporaryPin);
  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${staffMemberId}`);

  return {
    status: result.ok ? "success" : "error",
    message: result.message,
  };
}

export async function unlockStaffAction(formData: FormData) {
  const { staff: actor } = await requirePermission("staff.edit");
  const staffMemberId = getString(formData, "staffMemberId");
  const target = await getTargetStaffForPermissionChange(staffMemberId);

  if (!target || !canRoleManageTargetRole(actor.role, target.role)) {
    return;
  }

  await unlockStaffAccount(staffMemberId);
  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${staffMemberId}`);
}

export async function revokeStaffSessionsAction(formData: FormData) {
  const { staff: actor } = await requirePermission("staff.edit");
  const staffMemberId = getString(formData, "staffMemberId");
  const target = await getTargetStaffForPermissionChange(staffMemberId);

  if (!target || !canRoleManageTargetRole(actor.role, target.role)) {
    return;
  }

  await revokeStaffSessions(staffMemberId, "admin_revoked");
  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${staffMemberId}`);
}

export async function deactivateStaffAction(formData: FormData) {
  const { staff: actor } = await requirePermission("staff.edit");
  const staffMemberId = getString(formData, "staffMemberId");
  const reason = getString(formData, "reason") || "Deactivated by manager.";
  const target = await getTargetStaffForPermissionChange(staffMemberId);

  if (!target || !canRoleManageTargetRole(actor.role, target.role)) {
    return;
  }

  if (target?.role === "owner" && (await isFinalActiveOwner(staffMemberId))) {
    return;
  }

  await deactivateStaffMember(staffMemberId, reason);
  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${staffMemberId}`);
}

export async function reactivateStaffAction(formData: FormData) {
  const { staff: actor } = await requirePermission("staff.edit");
  const staffMemberId = getString(formData, "staffMemberId");
  const target = await getTargetStaffForPermissionChange(staffMemberId);

  if (!target || !canRoleManageTargetRole(actor.role, target.role)) {
    return;
  }

  await reactivateStaffMember(staffMemberId);
  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${staffMemberId}`);
}

export async function archiveStaffAction(formData: FormData) {
  const { staff: actor } = await requirePermission("staff.edit");
  const staffMemberId = getString(formData, "staffMemberId");
  const status = getString(formData, "archiveStatus") as Exclude<
    StaffEmploymentStatus,
    "active" | "on_leave"
  >;
  const reason = getString(formData, "reason") || "Archived by manager.";
  const target = await getTargetStaffForPermissionChange(staffMemberId);

  if (!target || !canRoleManageTargetRole(actor.role, target.role)) {
    return;
  }

  if (target?.role === "owner" && (await isFinalActiveOwner(staffMemberId))) {
    return;
  }

  await archiveStaffMember(staffMemberId, status, reason);
  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${staffMemberId}`);
}

export async function updateStaffPermissionsAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const { staff: actor } = await requirePermission("staff.permissions.manage");
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "error", message: "Permission management is not configured." };
  }

  const staffMemberId = getString(formData, "staffMemberId");
  const target = await getTargetStaffForPermissionChange(staffMemberId);

  if (!target) {
    return { status: "error", message: "Employee was not found." };
  }

  if (!canRoleManageTargetRole(actor.role, target.role)) {
    return { status: "error", message: "You cannot modify this employee role." };
  }

  const submittedPermissions = getSubmittedPermissions(formData);

  if (target.role === "owner" && (await isFinalActiveOwner(target.id))) {
    const missingCritical = permissions
      .filter((permission) => isOwnerCriticalPermission(permission.key))
      .filter((permission) => !submittedPermissions.includes(permission.key));

    if (missingCritical.length > 0) {
      return {
        status: "error",
        message:
          "The final active Owner must keep critical staff and security permissions.",
      };
    }
  }

  const defaultPermissions = new Set(getDefaultPermissionsForRole(target.role));
  const submittedSet = new Set(submittedPermissions);
  const overrides = permissions
    .map((permission) => {
      const defaultGranted = defaultPermissions.has(permission.key);
      const submittedGranted = submittedSet.has(permission.key);

      if (defaultGranted === submittedGranted) {
        return null;
      }

      return {
        staff_member_id: target.id,
        permission_key: permission.key,
        granted: submittedGranted,
        changed_by_staff_id: actor.staffId,
      };
    })
    .filter((override): override is NonNullable<typeof override> =>
      Boolean(override),
    );

  const { data: existing } = await supabase
    .from("staff_permission_assignments")
    .select("permission_key, granted")
    .eq("staff_member_id", target.id);

  const beforeEffective = new Set(
    permissions
      .filter((permission) => {
        const existingOverride = (existing ?? []).find(
          (assignment) => assignment.permission_key === permission.key,
        );

        return existingOverride
          ? existingOverride.granted
          : defaultPermissions.has(permission.key);
      })
      .map((permission) => permission.key),
  );

  const { error: deleteError } = await supabase
    .from("staff_permission_assignments")
    .delete()
    .eq("staff_member_id", target.id);

  if (deleteError) {
    return { status: "error", message: "Existing permissions could not be updated." };
  }

  if (overrides.length > 0) {
    const { error: insertError } = await supabase
      .from("staff_permission_assignments")
      .insert(overrides);

    if (insertError) {
      return { status: "error", message: "Permission overrides could not be saved." };
    }
  }

  const added = submittedPermissions.filter(
    (permission) => !beforeEffective.has(permission),
  );
  const removed = Array.from(beforeEffective).filter(
    (permission) => !submittedSet.has(permission),
  );

  await writePermissionAudit({
    actorId: actor.staffId,
    staffMemberId: target.id,
    action: "staff_permissions_updated",
    details: {
      employee_number: target.employee_number,
      permissions_added: added,
      permissions_removed: removed,
      changed_by: actor.employeeNumber,
    },
  });

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${target.id}`);

  return {
    status: "success",
    message: "Permissions updated.",
  };
}

export async function cloneStaffPermissionsAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const { staff: actor } = await requirePermission("staff.permissions.manage");
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "error", message: "Permission management is not configured." };
  }

  const targetStaffMemberId = getString(formData, "staffMemberId");
  const sourceStaffMemberId = getString(formData, "sourceStaffMemberId");
  const [target, source] = await Promise.all([
    getTargetStaffForPermissionChange(targetStaffMemberId),
    getTargetStaffForPermissionChange(sourceStaffMemberId),
  ]);

  if (!target || !source) {
    return { status: "error", message: "Employee lookup failed." };
  }

  if (target.id === source.id) {
    return { status: "error", message: "Choose a different employee to clone from." };
  }

  if (!canRoleManageTargetRole(actor.role, target.role)) {
    return { status: "error", message: "You cannot modify this employee role." };
  }

  const { data: sourceOverrides } = await supabase
    .from("staff_permission_assignments")
    .select("permission_key, granted")
    .eq("staff_member_id", source.id);

  const sourceDefaultPermissions = new Set(getDefaultPermissionsForRole(source.role));
  const sourceOverrideMap = new Map(
    (sourceOverrides ?? []).map((assignment) => [
      assignment.permission_key,
      assignment.granted,
    ]),
  );
  const sourceEffective = permissions
    .filter((permission) =>
      sourceOverrideMap.has(permission.key)
        ? sourceOverrideMap.get(permission.key)
        : sourceDefaultPermissions.has(permission.key),
    )
    .map((permission) => permission.key);

  if (target.role === "owner" && (await isFinalActiveOwner(target.id))) {
    const missingCritical = permissions
      .filter((permission) => isOwnerCriticalPermission(permission.key))
      .filter((permission) => !sourceEffective.includes(permission.key));

    if (missingCritical.length > 0) {
      return {
        status: "error",
        message:
          "The final active Owner must keep critical staff and security permissions.",
      };
    }
  }

  const targetDefaultPermissions = new Set(getDefaultPermissionsForRole(target.role));
  const sourceEffectiveSet = new Set(sourceEffective);
  const targetOverrides = permissions
    .map((permission) => {
      const defaultGranted = targetDefaultPermissions.has(permission.key);
      const sourceGranted = sourceEffectiveSet.has(permission.key);

      if (defaultGranted === sourceGranted) {
        return null;
      }

      return {
        staff_member_id: target.id,
        permission_key: permission.key,
        granted: sourceGranted,
        changed_by_staff_id: actor.staffId,
      };
    })
    .filter((override): override is NonNullable<typeof override> =>
      Boolean(override),
    );

  await supabase
    .from("staff_permission_assignments")
    .delete()
    .eq("staff_member_id", target.id);

  if (targetOverrides.length > 0) {
    const { error } = await supabase
      .from("staff_permission_assignments")
      .insert(targetOverrides);

    if (error) {
      return { status: "error", message: "Cloned permissions could not be saved." };
    }
  }

  await writePermissionAudit({
    actorId: actor.staffId,
    staffMemberId: target.id,
    action: "staff_permissions_cloned",
    details: {
      employee_number: target.employee_number,
      cloned_from_employee_number: source.employee_number,
      permissions_applied: sourceEffective,
      changed_by: actor.employeeNumber,
    },
  });

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${target.id}`);

  return {
    status: "success",
    message: `Permissions cloned from ${source.employee_number}.`,
  };
}
