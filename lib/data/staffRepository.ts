import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  StaffPermissionAssignment,
  StaffRole,
} from "@/lib/staff/permissionTypes";
import { getEffectivePermissions } from "@/lib/staff/permissionHelpers";
import { getDefaultBusinessTitle } from "@/lib/staff/roleLabels";
import type {
  StaffAuthEvent,
  StaffFilters,
  StaffMember,
  StaffMetrics,
  StaffSessionSummary,
} from "@/lib/types/staff";

type StaffMemberRow = Omit<StaffMember, "assigned_location_name"> & {
  location?: { name?: string | null } | { name?: string | null }[] | null;
};

function getLocationName(row: StaffMemberRow) {
  const location = Array.isArray(row.location) ? row.location[0] : row.location;

  return location?.name ?? null;
}

function normalizeStaffMember(row: StaffMemberRow): StaffMember {
  return {
    id: row.id,
    employee_number: row.employee_number,
    first_name: row.first_name,
    last_name: row.last_name,
    display_name: row.display_name,
    business_title: row.business_title ?? getDefaultBusinessTitle(row.role),
    role: row.role,
    active: row.active,
    assigned_location_id: row.assigned_location_id,
    assigned_location_name: getLocationName(row),
    employment_status: row.employment_status ?? "active",
    must_change_pin: row.must_change_pin ?? true,
    pin_changed_at: row.pin_changed_at,
    failed_login_attempts: row.failed_login_attempts ?? 0,
    locked_until: row.locked_until,
    last_login_at: row.last_login_at,
    last_activity_at: row.last_activity_at,
    archived_at: row.archived_at,
    archive_reason: row.archive_reason,
    terminated_at: row.terminated_at,
    termination_reason: row.termination_reason,
    sessions_revoked_at: row.sessions_revoked_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function applyStaffFilters(staff: StaffMember[], filters?: StaffFilters) {
  if (!filters) {
    return staff;
  }

  const search = filters.search?.trim().toLowerCase();

  return staff.filter((member) => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    const displayName = member.display_name?.toLowerCase() ?? "";
    const locked =
      member.locked_until !== null &&
      new Date(member.locked_until).getTime() > Date.now();

    return (
      (!search ||
        member.employee_number.toLowerCase().includes(search) ||
        fullName.includes(search) ||
        displayName.includes(search)) &&
      (!filters.role || filters.role === "all" || member.role === filters.role) &&
      (!filters.employmentStatus ||
        filters.employmentStatus === "all" ||
        member.employment_status === filters.employmentStatus) &&
      (!filters.active ||
        filters.active === "all" ||
        (filters.active === "active" ? member.active : !member.active)) &&
      (!filters.locked ||
        filters.locked === "all" ||
        (filters.locked === "locked" ? locked : !locked)) &&
      (!filters.locationId ||
        filters.locationId === "all" ||
        member.assigned_location_id === filters.locationId)
    );
  });
}

export async function getStaffMembers(filters?: StaffFilters) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return [] satisfies StaffMember[];
  }

  const selectWithBusinessTitle =
    "id, employee_number, first_name, last_name, display_name, business_title, role, active, assigned_location_id, employment_status, must_change_pin, pin_changed_at, failed_login_attempts, locked_until, last_login_at, last_activity_at, archived_at, archive_reason, terminated_at, termination_reason, sessions_revoked_at, created_at, updated_at, location:inventory_locations(name)";
  const legacySelect =
    "id, employee_number, first_name, last_name, display_name, role, active, assigned_location_id, employment_status, must_change_pin, pin_changed_at, failed_login_attempts, locked_until, last_login_at, last_activity_at, archived_at, archive_reason, terminated_at, termination_reason, sessions_revoked_at, created_at, updated_at, location:inventory_locations(name)";

  const result = await supabase
    .from("staff_members")
    .select(selectWithBusinessTitle)
    .order("created_at", { ascending: false });

  const { data, error } =
    result.error?.code === "42703" ||
    result.error?.message.includes("business_title")
      ? await supabase
          .from("staff_members")
          .select(legacySelect)
          .order("created_at", { ascending: false })
      : result;

  if (error || !data) {
    return [];
  }

  return applyStaffFilters((data as StaffMemberRow[]).map(normalizeStaffMember), filters);
}

export async function getStaffMemberById(id: string) {
  return (await getStaffMembers()).find((member) => member.id === id) ?? null;
}

export async function getStaffPermissionAssignments(staffMemberId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return [] satisfies StaffPermissionAssignment[];
  }

  const { data, error } = await supabase
    .from("staff_permission_assignments")
    .select("permission_key, granted")
    .eq("staff_member_id", staffMemberId);

  if (error || !data) {
    return [] satisfies StaffPermissionAssignment[];
  }

  return (data as StaffPermissionAssignment[]).filter(
    (assignment) => typeof assignment.permission_key === "string",
  );
}

export async function getStaffEffectivePermissions(
  staffMemberId: string,
  role: StaffRole,
) {
  const assignments = await getStaffPermissionAssignments(staffMemberId);

  return getEffectivePermissions(role, assignments);
}

export async function getStaffPermissionSnapshot(staffMemberId: string, role: StaffRole) {
  const assignments = await getStaffPermissionAssignments(staffMemberId);

  return {
    assignments,
    effectivePermissions: getEffectivePermissions(role, assignments),
  };
}

export async function getStaffMemberByEmployeeNumber(employeeNumber: string) {
  const normalizedEmployeeNumber = employeeNumber.trim().toUpperCase();

  return (
    (await getStaffMembers()).find(
      (member) => member.employee_number === normalizedEmployeeNumber,
    ) ?? null
  );
}

export async function getActiveStaffMembers() {
  return (await getStaffMembers()).filter(
    (member) => member.active && member.employment_status === "active",
  );
}

export async function getArchivedStaffMembers() {
  return (await getStaffMembers()).filter(
    (member) =>
      !member.active ||
      ["archived", "resigned", "terminated", "retired"].includes(
        member.employment_status,
      ),
  );
}

export async function getStaffSessions(staffMemberId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return [] satisfies StaffSessionSummary[];
  }

  const { data, error } = await supabase
    .from("staff_sessions")
    .select(
      "id, staff_member_id, created_at, last_activity_at, expires_at, revoked_at, revoked_reason, ip_address, user_agent, device_name",
    )
    .eq("staff_member_id", staffMemberId)
    .order("created_at", { ascending: false });

  return error || !data ? [] : (data as StaffSessionSummary[]);
}

export async function getStaffAuthEvents(staffMemberId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return [] satisfies StaffAuthEvent[];
  }

  const { data, error } = await supabase
    .from("staff_auth_events")
    .select(
      "id, staff_member_id, employee_number, event_type, success, ip_address, user_agent, failure_reason, created_at",
    )
    .eq("staff_member_id", staffMemberId)
    .order("created_at", { ascending: false });

  return error || !data ? [] : (data as StaffAuthEvent[]);
}

export async function getStaffMetrics(): Promise<StaffMetrics> {
  const staff = await getStaffMembers();
  const now = Date.now();

  return {
    totalStaff: staff.length,
    activeStaff: staff.filter(
      (member) => member.active && member.employment_status === "active",
    ).length,
    lockedStaff: staff.filter(
      (member) =>
        member.locked_until !== null &&
        new Date(member.locked_until).getTime() > now,
    ).length,
    onLeaveStaff: staff.filter((member) => member.employment_status === "on_leave")
      .length,
    archivedStaff: staff.filter(
      (member) =>
        !member.active ||
        ["archived", "resigned", "terminated", "retired"].includes(
          member.employment_status,
        ),
    ).length,
    managers: staff.filter((member) =>
      ["manager", "store_manager", "assistant_manager"].includes(member.role),
    ).length,
    managingPartners: staff.filter((member) => member.role === "managing_partner")
      .length,
    cashiers: staff.filter((member) => member.role === "cashier").length,
    fulfillment: staff.filter((member) => member.role === "fulfillment").length,
    inventory: staff.filter((member) => member.role === "inventory").length,
  };
}

export async function staffMemberHasBusinessActivity(staffMemberId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return true;
  }

  const { count } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("staff_user_id", staffMemberId);

  return (count ?? 0) > 0;
}
