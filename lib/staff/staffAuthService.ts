import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { hashPin, validatePinFormat, verifyPin } from "@/lib/staff/pinSecurity";
import {
  clearStaffSessionCookie,
  generateRawSessionToken,
  getInactivityExpirationDate,
  getSessionExpirationDate,
  getStaffSessionConfig,
  getStaffSessionCookie,
  hashSessionToken,
  setStaffSessionCookie,
} from "@/lib/staff/sessionSecurity";
import { staffHasPermission, type StaffSession } from "@/lib/staff/staffSession";
import type { StaffEmploymentStatus, StaffMember } from "@/lib/types/staff";

type StaffMemberAuthRow = {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  pin_hash: string;
  role: StaffSession["role"];
  active: boolean;
  assigned_location_id: string | null;
  employment_status: StaffEmploymentStatus | null;
  must_change_pin: boolean | null;
  failed_login_attempts: number | null;
  locked_until: string | null;
  sessions_revoked_at: string | null;
  location?: {
    id?: string | null;
    name?: string | null;
    code?: string | null;
  } | null;
};

type StaffSessionRow = {
  id: string;
  staff_member_id: string;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  revoked_at: string | null;
  staff_member?: StaffMemberAuthRow | StaffMemberAuthRow[] | null;
};

export type StaffRequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
};

export type StaffAuthResult =
  | { ok: true; redirectTo: string; staff: StaffSession }
  | { ok: false; message: string; code?: string };

export type StaffSessionFailureReason =
  | "missing"
  | "lookup_failed"
  | "expired"
  | "revoked"
  | "inactive"
  | "stale";

export type StaffReadOnlySessionResult =
  | { ok: true; staff: StaffSession }
  | { ok: false; reason: StaffSessionFailureReason };

const genericLoginError = "Employee number or PIN is incorrect.";

function normalizeEmployeeNumber(employeeNumber: string) {
  return employeeNumber.trim().toUpperCase();
}

function getDisplayName(staff: StaffMemberAuthRow) {
  return (
    staff.display_name ||
    `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() ||
    staff.employee_number
  );
}

function toStaffSession(staff: StaffMemberAuthRow): StaffSession {
  return {
    staffId: staff.id,
    employeeNumber: staff.employee_number,
    displayName: getDisplayName(staff),
    role: staff.role,
    mustChangePin: staff.must_change_pin ?? false,
    location: {
      id: staff.location?.id ?? staff.assigned_location_id ?? "unassigned",
      name: staff.location?.name ?? "Unassigned",
      code: staff.location?.code ?? "UNASSIGNED",
    },
    authenticated: true,
  };
}

function getStaffFromSessionRow(row: StaffSessionRow) {
  return Array.isArray(row.staff_member)
    ? row.staff_member[0]
    : row.staff_member;
}

async function getRequestMetadata(): Promise<StaffRequestMetadata> {
  const headerStore = await headers();

  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip"),
    userAgent: headerStore.get("user-agent"),
  };
}

async function recordAuthEvent(input: {
  staffMemberId?: string | null;
  employeeNumber?: string | null;
  eventType: string;
  success: boolean;
  failureReason?: string | null;
  metadata?: StaffRequestMetadata;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  await supabase.from("staff_auth_events").insert({
    staff_member_id: input.staffMemberId ?? null,
    employee_number: input.employeeNumber ?? null,
    event_type: input.eventType,
    success: input.success,
    failure_reason: input.failureReason ?? null,
    ip_address: input.metadata?.ipAddress ?? null,
    user_agent: input.metadata?.userAgent ?? null,
  });
}

async function writeStaffAudit(
  action: string,
  targetStaffId: string | null,
  details: Record<string, unknown> = {},
) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  const actor = await getAuthenticatedStaffReadOnly();

  await supabase.from("audit_logs").insert({
    staff_user_id: actor?.staffId ?? null,
    action,
    entity_type: "staff",
    entity_id: targetStaffId,
    details,
  });
}

async function findStaffByEmployeeNumber(employeeNumber: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("staff_members")
    .select(
      "id, employee_number, first_name, last_name, display_name, pin_hash, role, active, assigned_location_id, employment_status, must_change_pin, failed_login_attempts, locked_until, sessions_revoked_at, location:inventory_locations(id, name, code)",
    )
    .eq("employee_number", employeeNumber)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as StaffMemberAuthRow | null;
}

export async function authenticateStaff(
  employeeNumber: string,
  pin: string,
  requestMetadata?: StaffRequestMetadata,
): Promise<StaffAuthResult> {
  const supabase = createSupabaseServiceClient();
  const metadata = requestMetadata ?? (await getRequestMetadata());
  const normalizedEmployeeNumber = normalizeEmployeeNumber(employeeNumber);

  if (!supabase) {
    return {
      ok: false,
      message: "Staff authentication is not configured.",
      code: "service_not_configured",
    };
  }

  const staff = await findStaffByEmployeeNumber(normalizedEmployeeNumber);

  if (!staff) {
    await recordAuthEvent({
      employeeNumber: normalizedEmployeeNumber,
      eventType: "login_failed",
      success: false,
      failureReason: "invalid_credentials",
      metadata,
    });

    return { ok: false, message: genericLoginError, code: "invalid_credentials" };
  }

  const employmentStatus = staff.employment_status ?? "active";

  if (!staff.active || employmentStatus !== "active") {
    await recordAuthEvent({
      staffMemberId: staff.id,
      employeeNumber: normalizedEmployeeNumber,
      eventType: "login_failed",
      success: false,
      failureReason: "inactive_access",
      metadata,
    });

    return { ok: false, message: "Access inactive. Contact a manager.", code: "inactive" };
  }

  if (staff.locked_until && new Date(staff.locked_until).getTime() > Date.now()) {
    await recordAuthEvent({
      staffMemberId: staff.id,
      employeeNumber: normalizedEmployeeNumber,
      eventType: "login_failed",
      success: false,
      failureReason: "account_locked",
      metadata,
    });

    return { ok: false, message: "Account locked. Contact a manager.", code: "locked" };
  }

  const pinMatches = await verifyPin(pin, staff.pin_hash);

  if (!pinMatches) {
    const { maxFailedAttempts, lockoutMinutes } = getStaffSessionConfig();
    const failedAttempts = (staff.failed_login_attempts ?? 0) + 1;
    const shouldLock = failedAttempts >= maxFailedAttempts;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString()
      : null;

    await supabase
      .from("staff_members")
      .update({
        failed_login_attempts: failedAttempts,
        locked_until: lockedUntil,
      })
      .eq("id", staff.id);

    await recordAuthEvent({
      staffMemberId: staff.id,
      employeeNumber: normalizedEmployeeNumber,
      eventType: "login_failed",
      success: false,
      failureReason: shouldLock ? "account_locked" : "invalid_credentials",
      metadata,
    });

    if (shouldLock) {
      await recordAuthEvent({
        staffMemberId: staff.id,
        employeeNumber: normalizedEmployeeNumber,
        eventType: "account_locked",
        success: true,
        metadata,
      });
    }

    return { ok: false, message: genericLoginError, code: "invalid_credentials" };
  }

  const rawSessionToken = generateRawSessionToken();
  const sessionTokenHash = hashSessionToken(rawSessionToken);
  const expiresAt = getSessionExpirationDate();
  const now = new Date().toISOString();

  const { data: sessionData, error: sessionError } = await supabase
    .from("staff_sessions")
    .insert({
      staff_member_id: staff.id,
      session_token_hash: sessionTokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: metadata.ipAddress ?? null,
      user_agent: metadata.userAgent ?? null,
      device_name: metadata.deviceName ?? null,
    })
    .select("id")
    .single();

  if (sessionError || !sessionData) {
    return {
      ok: false,
      message: "Staff authentication is temporarily unavailable.",
      code: "session_create_failed",
    };
  }

  await supabase
    .from("staff_members")
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: now,
      last_activity_at: now,
    })
    .eq("id", staff.id);

  await setStaffSessionCookie(rawSessionToken, expiresAt);
  await recordAuthEvent({
    staffMemberId: staff.id,
    employeeNumber: normalizedEmployeeNumber,
    eventType: "login_success",
    success: true,
    metadata,
  });

  const staffSession = toStaffSession(staff);

  return {
    ok: true,
    redirectTo: staffSession.mustChangePin ? "/staff/change-pin" : "/staff",
    staff: staffSession,
  };
}

export async function getAuthenticatedStaff(): Promise<StaffSession | null> {
  return getAuthenticatedStaffReadOnly();
}

export async function getAuthenticatedStaffReadOnly(): Promise<StaffSession | null> {
  const result = await getAuthenticatedStaffReadOnlyResult();

  return result.ok ? result.staff : null;
}

export async function getAuthenticatedStaffReadOnlyResult(): Promise<StaffReadOnlySessionResult> {
  const supabase = createSupabaseServiceClient();
  const rawToken = await getStaffSessionCookie();

  if (!supabase || !rawToken) {
    return { ok: false, reason: "missing" };
  }

  const sessionTokenHash = hashSessionToken(rawToken);
  const { data, error } = await supabase
    .from("staff_sessions")
    .select(
      "id, staff_member_id, created_at, last_activity_at, expires_at, revoked_at, staff_member:staff_members(id, employee_number, first_name, last_name, display_name, pin_hash, role, active, assigned_location_id, employment_status, must_change_pin, failed_login_attempts, locked_until, sessions_revoked_at, location:inventory_locations(id, name, code))",
    )
    .eq("session_token_hash", sessionTokenHash)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "lookup_failed" };
  }

  const sessionRow = data as StaffSessionRow;
  const staff = getStaffFromSessionRow(sessionRow);
  const now = Date.now();

  if (!staff) {
    return { ok: false, reason: "lookup_failed" };
  }

  if (sessionRow.revoked_at) {
    return { ok: false, reason: "revoked" };
  }

  if (
    new Date(sessionRow.expires_at).getTime() <= now ||
    getInactivityExpirationDate(sessionRow.last_activity_at).getTime() <= now
  ) {
    return { ok: false, reason: "expired" };
  }

  if (!staff.active || (staff.employment_status ?? "active") !== "active") {
    return { ok: false, reason: "inactive" };
  }

  if (
    staff.sessions_revoked_at &&
    new Date(staff.sessions_revoked_at).getTime() >
      new Date(sessionRow.created_at).getTime()
  ) {
    return { ok: false, reason: "stale" };
  }

  return { ok: true, staff: toStaffSession(staff) };
}

export async function requireAuthenticatedStaff() {
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

  return staff;
}

export async function requireStaffManagementAccess() {
  const staff = await requireAuthenticatedStaff();

  if (!staffHasPermission(staff, "staff.edit")) {
    redirect("/staff/login?status=access_denied");
  }

  return staff;
}

export async function logoutCurrentStaff() {
  const supabase = createSupabaseServiceClient();
  const rawToken = await getStaffSessionCookie();
  const metadata = await getRequestMetadata();

  if (supabase && rawToken) {
    const sessionTokenHash = hashSessionToken(rawToken);
    const { data } = await supabase
      .from("staff_sessions")
      .select("id, staff_member_id")
      .eq("session_token_hash", sessionTokenHash)
      .maybeSingle();

    if (data) {
      await supabase
        .from("staff_sessions")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: "logout",
        })
        .eq("id", data.id);
      await recordAuthEvent({
        staffMemberId: data.staff_member_id,
        eventType: "logout",
        success: true,
        metadata,
      });
    }
  }

  await clearStaffSessionCookie();
}

export async function revokeStaffSessions(staffMemberId: string, reason: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { ok: false, message: "Staff authentication is not configured." };
  }

  const now = new Date().toISOString();

  await supabase
    .from("staff_sessions")
    .update({ revoked_at: now, revoked_reason: reason })
    .eq("staff_member_id", staffMemberId)
    .is("revoked_at", null);

  await supabase
    .from("staff_members")
    .update({ sessions_revoked_at: now })
    .eq("id", staffMemberId);

  await recordAuthEvent({
    staffMemberId,
    eventType: "session_revoked",
    success: true,
    failureReason: reason,
  });
  await writeStaffAudit("sessions_revoked", staffMemberId, { reason });

  return { ok: true, message: "Sessions revoked." };
}

export async function refreshStaffActivity() {
  const supabase = createSupabaseServiceClient();
  const rawToken = await getStaffSessionCookie();

  if (!supabase || !rawToken) {
    return;
  }

  const now = new Date().toISOString();
  await supabase
    .from("staff_sessions")
    .update({ last_activity_at: now })
    .eq("session_token_hash", hashSessionToken(rawToken))
    .is("revoked_at", null);
}

export async function changeOwnPin(currentPin: string, newPin: string) {
  const supabase = createSupabaseServiceClient();
  const staff = await getAuthenticatedStaff();

  if (!supabase || !staff) {
    return { ok: false, message: "Session expired. Sign in again." };
  }

  const row = await findStaffByEmployeeNumber(staff.employeeNumber);

  if (!row || !(await verifyPin(currentPin, row.pin_hash))) {
    return { ok: false, message: "Current PIN is incorrect." };
  }

  if (await verifyPin(newPin, row.pin_hash)) {
    return { ok: false, message: "New PIN must be different." };
  }

  const validation = validatePinFormat(newPin, staff.employeeNumber);

  if (!validation.valid) {
    return { ok: false, message: validation.error };
  }

  const newPinHash = await hashPin(newPin);
  const now = new Date().toISOString();

  await supabase
    .from("staff_members")
    .update({
      pin_hash: newPinHash,
      must_change_pin: false,
      pin_changed_at: now,
      updated_by_staff_id: staff.staffId,
    })
    .eq("id", staff.staffId);

  await supabase
    .from("staff_sessions")
    .update({ revoked_at: now, revoked_reason: "pin_changed_other_session" })
    .eq("staff_member_id", staff.staffId)
    .neq("session_token_hash", hashSessionToken((await getStaffSessionCookie()) ?? ""))
    .is("revoked_at", null);

  await recordAuthEvent({
    staffMemberId: staff.staffId,
    eventType: "pin_changed",
    success: true,
  });
  await writeStaffAudit("pin_changed", staff.staffId);

  return { ok: true, message: "PIN changed." };
}

export async function resetStaffPinAsOwner(
  staffMemberId: string,
  newTemporaryPin: string,
) {
  const actor = await requireStaffManagementAccess();
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { ok: false, message: "Staff authentication is not configured." };
  }

  const { data: target } = await supabase
    .from("staff_members")
    .select("id, employee_number, role")
    .eq("id", staffMemberId)
    .maybeSingle();

  if (!target) {
    return { ok: false, message: "Staff member not found." };
  }

  if (actor.role === "manager" && target.role === "owner") {
    return { ok: false, message: "Managers cannot reset Owner PINs." };
  }

  const validation = validatePinFormat(
    newTemporaryPin,
    target.employee_number ?? undefined,
  );

  if (!validation.valid) {
    return { ok: false, message: validation.error };
  }

  await supabase
    .from("staff_members")
    .update({
      pin_hash: await hashPin(newTemporaryPin),
      must_change_pin: true,
      failed_login_attempts: 0,
      locked_until: null,
      updated_by_staff_id: actor.staffId,
    })
    .eq("id", staffMemberId);

  await revokeStaffSessions(staffMemberId, "pin_reset");
  await recordAuthEvent({
    staffMemberId,
    eventType: "pin_reset",
    success: true,
  });
  await writeStaffAudit("pin_reset", staffMemberId);

  return { ok: true, message: "Temporary PIN set. Employee must change it." };
}

export async function unlockStaffAccount(staffMemberId: string) {
  const actor = await requireStaffManagementAccess();
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { ok: false, message: "Staff authentication is not configured." };
  }

  await supabase
    .from("staff_members")
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      updated_by_staff_id: actor.staffId,
    })
    .eq("id", staffMemberId);
  await recordAuthEvent({ staffMemberId, eventType: "account_unlocked", success: true });
  await writeStaffAudit("staff_unlocked", staffMemberId);

  return { ok: true, message: "Staff account unlocked." };
}

export async function deactivateStaffMember(staffMemberId: string, reason: string) {
  const actor = await requireStaffManagementAccess();
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { ok: false, message: "Staff authentication is not configured." };
  }

  await supabase
    .from("staff_members")
    .update({
      active: false,
      updated_by_staff_id: actor.staffId,
    })
    .eq("id", staffMemberId);
  await revokeStaffSessions(staffMemberId, "employee_deactivated");
  await recordAuthEvent({
    staffMemberId,
    eventType: "employee_deactivated",
    success: true,
    failureReason: reason,
  });
  await writeStaffAudit("staff_deactivated", staffMemberId, { reason });

  return { ok: true, message: "Staff member deactivated." };
}

export async function reactivateStaffMember(staffMemberId: string) {
  const actor = await requireStaffManagementAccess();
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { ok: false, message: "Staff authentication is not configured." };
  }

  await supabase
    .from("staff_members")
    .update({
      active: true,
      employment_status: "active",
      archived_at: null,
      archive_reason: null,
      terminated_at: null,
      termination_reason: null,
      must_change_pin: true,
      updated_by_staff_id: actor.staffId,
    })
    .eq("id", staffMemberId);
  await revokeStaffSessions(staffMemberId, "employee_reactivated");
  await recordAuthEvent({
    staffMemberId,
    eventType: "employee_reactivated",
    success: true,
  });
  await writeStaffAudit("staff_reactivated", staffMemberId);

  return { ok: true, message: "Staff member reactivated. PIN reset required." };
}

export async function archiveStaffMember(
  staffMemberId: string,
  status: Exclude<StaffEmploymentStatus, "active" | "on_leave">,
  reason: string,
) {
  const actor = await requireStaffManagementAccess();
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { ok: false, message: "Staff authentication is not configured." };
  }

  const now = new Date().toISOString();

  await supabase
    .from("staff_members")
    .update({
      active: false,
      employment_status: status,
      archived_at: status === "archived" ? now : null,
      archive_reason: status === "archived" ? reason : null,
      terminated_at: status === "terminated" ? now : null,
      termination_reason: status === "terminated" ? reason : null,
      updated_by_staff_id: actor.staffId,
    })
    .eq("id", staffMemberId);
  await revokeStaffSessions(staffMemberId, `employee_${status}`);
  await recordAuthEvent({
    staffMemberId,
    eventType: "employee_archived",
    success: true,
    failureReason: reason,
  });
  await writeStaffAudit("staff_archived", staffMemberId, { status, reason });

  return { ok: true, message: "Staff member archived." };
}

export async function restoreArchivedStaffMember(staffMemberId: string) {
  return reactivateStaffMember(staffMemberId);
}

export async function sanitizeStaffForClient(staff: StaffMember) {
  return staff;
}
