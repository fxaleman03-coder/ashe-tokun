import type { StaffRole } from "@/lib/staff/staffSession";

export type StaffEmploymentStatus =
  | "active"
  | "on_leave"
  | "resigned"
  | "terminated"
  | "retired"
  | "archived";

export type StaffMember = {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  business_title: string | null;
  role: StaffRole;
  active: boolean;
  assigned_location_id: string | null;
  assigned_location_name: string | null;
  employment_status: StaffEmploymentStatus;
  must_change_pin: boolean;
  pin_changed_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  last_activity_at: string | null;
  archived_at: string | null;
  archive_reason: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  sessions_revoked_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type StaffSessionSummary = {
  id: string;
  staff_member_id: string;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
};

export type StaffAuthEvent = {
  id: string;
  staff_member_id: string | null;
  employee_number: string | null;
  event_type: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  created_at: string;
};

export type CreateStaffInput = {
  employee_number: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  role: StaffRole;
  assigned_location_id?: string;
  temporary_pin: string;
  active: boolean;
};

export type UpdateStaffInput = {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  business_title?: string;
  role?: StaffRole;
  assigned_location_id?: string | null;
  employment_status?: StaffEmploymentStatus;
  active?: boolean;
};

export type StaffFilters = {
  search?: string;
  role?: string;
  employmentStatus?: string;
  active?: string;
  locked?: string;
  locationId?: string;
};

export type StaffMetrics = {
  totalStaff: number;
  activeStaff: number;
  lockedStaff: number;
  onLeaveStaff: number;
  archivedStaff: number;
  managers: number;
  managingPartners: number;
  cashiers: number;
  fulfillment: number;
  inventory: number;
};

export type ArchiveStaffInput = {
  status: Exclude<StaffEmploymentStatus, "active" | "on_leave">;
  reason: string;
};

export type ResetPinInput = {
  staffMemberId: string;
  newTemporaryPin: string;
};
