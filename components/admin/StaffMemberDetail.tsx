"use client";

import { useActionState } from "react";
import {
  archiveStaffAction,
  cloneStaffPermissionsAction,
  deactivateStaffAction,
  reactivateStaffAction,
  resetStaffPinAction,
  revokeStaffSessionsAction,
  type StaffActionState,
  unlockStaffAction,
  updateStaffPermissionsAction,
} from "@/lib/staff/staffActions";
import { permissionGroups } from "@/lib/staff/permissionGroups";
import { permissions } from "@/lib/staff/permissions";
import { roleTemplates } from "@/lib/staff/roleTemplates";
import type { PermissionKey } from "@/lib/staff/permissionTypes";
import type {
  StaffAuthEvent,
  StaffMember,
  StaffSessionSummary,
} from "@/lib/types/staff";

type StaffMemberDetailProps = {
  member: StaffMember;
  sessions: StaffSessionSummary[];
  events: StaffAuthEvent[];
  hasBusinessActivity: boolean;
  effectivePermissions: PermissionKey[];
  staffOptions: StaffMember[];
};

const initialState: StaffActionState = {
  message: "",
  status: "idle",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm text-[#e8dcc8]/68">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-col gap-1 border-b border-[#f7ead2]/10 pb-3 sm:flex-row sm:justify-between">
      <span className="text-[#d8a344]">{label}</span>
      <span>{value}</span>
    </p>
  );
}

export default function StaffMemberDetail({
  member,
  sessions,
  events,
  hasBusinessActivity,
  effectivePermissions,
  staffOptions,
}: StaffMemberDetailProps) {
  const [resetState, resetAction] = useActionState(
    resetStaffPinAction,
    initialState,
  );
  const [permissionState, permissionAction] = useActionState(
    updateStaffPermissionsAction,
    initialState,
  );
  const [cloneState, cloneAction] = useActionState(
    cloneStaffPermissionsAction,
    initialState,
  );
  const effectivePermissionSet = new Set(effectivePermissions);
  const roleTemplate = roleTemplates[member.role];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
      <div className="space-y-6">
        <DetailCard title="Profile">
          <Row label="Employee Number" value={member.employee_number} />
          <Row
            label="Name"
            value={`${member.first_name} ${member.last_name}`}
          />
          <Row label="Display Name" value={member.display_name ?? "Pending"} />
          <Row label="Role" value={member.role} />
          <Row
            label="Location"
            value={member.assigned_location_name ?? "Unassigned"}
          />
          <Row label="Employment Status" value={member.employment_status} />
        </DetailCard>

        <DetailCard title="Security">
          <Row label="Last Login" value={formatDate(member.last_login_at)} />
          <Row
            label="Failed Attempts"
            value={String(member.failed_login_attempts)}
          />
          <Row label="Locked Until" value={formatDate(member.locked_until)} />
          <Row
            label="Must Change PIN"
            value={member.must_change_pin ? "Yes" : "No"}
          />
          <Row label="Active Sessions" value={String(sessions.filter((session) => !session.revoked_at).length)} />
        </DetailCard>

        <DetailCard title="Employment Lifecycle">
          <Row label="Active" value={member.active ? "Yes" : "No"} />
          <Row label="Archived At" value={formatDate(member.archived_at)} />
          <Row label="Archive Reason" value={member.archive_reason ?? "Pending"} />
          <Row label="Terminated At" value={formatDate(member.terminated_at)} />
          <Row
            label="Termination Reason"
            value={member.termination_reason ?? "Pending"}
          />
          <Row
            label="Business Activity"
            value={hasBusinessActivity ? "Historical activity found" : "No activity found"}
          />
        </DetailCard>

        <DetailCard title="Permissions">
          <div className="border border-[#d8a344]/20 bg-[#0f0b07] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Role Template
            </p>
            <p className="mt-2 font-serif text-xl font-semibold text-[#f7ead2]">
              {roleTemplate.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#e8dcc8]/62">
              Roles provide default templates. The checked permissions below are
              the effective source of authorization for this employee.
            </p>
          </div>

          <form action={permissionAction} className="space-y-4">
            <input type="hidden" name="staffMemberId" value={member.id} />
            {permissionGroups.map((group) => {
              const groupedPermissions = permissions.filter(
                (permission) => permission.group === group.id,
              );

              if (groupedPermissions.length === 0) {
                return null;
              }

              return (
                <details
                  key={group.id}
                  className="border border-[#f7ead2]/10 bg-[#0f0b07]"
                >
                  <summary className="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                    {group.label}
                  </summary>
                  <div className="space-y-3 border-t border-[#f7ead2]/10 p-4">
                    <p className="text-xs leading-5 text-[#e8dcc8]/55">
                      {group.description}
                    </p>
                    <div className="grid gap-3">
                      {groupedPermissions.map((permission) => (
                        <label
                          key={permission.key}
                          className="flex gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-3"
                        >
                          <input
                            name={`permission:${permission.key}`}
                            type="checkbox"
                            defaultChecked={effectivePermissionSet.has(
                              permission.key,
                            )}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-[#f7ead2]">
                              {permission.label}
                            </span>
                            <span className="mt-1 block font-mono text-[0.68rem] text-[#d8a344]/80">
                              {permission.key}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-[#e8dcc8]/55">
                              {permission.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
            <button className="min-h-11 border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]">
              Save Permissions
            </button>
            {permissionState.message ? <p>{permissionState.message}</p> : null}
          </form>
        </DetailCard>
      </div>

      <div className="space-y-6">
        <DetailCard title="Clone Permissions">
          <form action={cloneAction} className="space-y-3">
            <input type="hidden" name="staffMemberId" value={member.id} />
            <p className="text-sm leading-6 text-[#e8dcc8]/60">
              Clone an existing employee permission set into this employee.
              Permission changes are audited.
            </p>
            <select
              name="sourceStaffMemberId"
              required
              defaultValue=""
              className="min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
            >
              <option value="" disabled>
                Select employee
              </option>
              {staffOptions
                .filter((staffMember) => staffMember.id !== member.id)
                .map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.employee_number} /{" "}
                    {staffMember.display_name ||
                      `${staffMember.first_name} ${staffMember.last_name}`}
                  </option>
                ))}
            </select>
            <button className="min-h-11 border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]">
              Apply Clone
            </button>
            {cloneState.message ? <p>{cloneState.message}</p> : null}
          </form>
        </DetailCard>

        <DetailCard title="Actions">
          <form action={resetAction} className="space-y-3">
            <input type="hidden" name="staffMemberId" value={member.id} />
            <p className="text-sm leading-6 text-[#e8dcc8]/60">
              Resetting this PIN will sign the employee out of all active sessions.
            </p>
            <input
              name="temporaryPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Temporary PIN"
              className="min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
            />
            <input
              name="confirmTemporaryPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Confirm Temporary PIN"
              className="min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
            />
            <button className="min-h-11 border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]">
              Reset PIN
            </button>
            {resetState.message ? <p>{resetState.message}</p> : null}
          </form>

          <div className="flex flex-wrap gap-2">
            <form action={unlockStaffAction}>
              <input type="hidden" name="staffMemberId" value={member.id} />
              <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                Unlock
              </button>
            </form>
            <form action={revokeStaffSessionsAction}>
              <input type="hidden" name="staffMemberId" value={member.id} />
              <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                Revoke Sessions
              </button>
            </form>
            <form action={member.active ? deactivateStaffAction : reactivateStaffAction}>
              <input type="hidden" name="staffMemberId" value={member.id} />
              <input
                type="hidden"
                name="reason"
                value="Changed from staff detail."
              />
              <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                {member.active ? "Deactivate" : "Reactivate"}
              </button>
            </form>
            <form action={archiveStaffAction}>
              <input type="hidden" name="staffMemberId" value={member.id} />
              <select
                name="archiveStatus"
                defaultValue="archived"
                className="mr-2 min-h-9 border border-[#f7ead2]/10 bg-[#0f0b07] px-2 text-xs text-[#f7ead2]"
              >
                <option value="archived">Archived</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
                <option value="retired">Retired</option>
              </select>
              <input
                type="hidden"
                name="reason"
                value="Archived from staff detail."
              />
              <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                Archive Employee
              </button>
            </form>
          </div>
        </DetailCard>

        <DetailCard title="Authentication Events">
          {events.length === 0 ? <p>No events yet.</p> : null}
          {events.slice(0, 12).map((event) => (
            <div key={event.id} className="border-b border-[#f7ead2]/10 pb-3">
              <p className="font-semibold text-[#f7ead2]">{event.event_type}</p>
              <p className="text-xs text-[#e8dcc8]/50">
                {formatDate(event.created_at)} / {event.success ? "Success" : "Failed"}
              </p>
            </div>
          ))}
        </DetailCard>
      </div>
    </div>
  );
}
