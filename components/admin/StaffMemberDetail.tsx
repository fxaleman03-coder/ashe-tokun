"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  deactivateStaffAction,
  reactivateStaffAction,
  resetStaffPinAction,
  type StaffActionState,
} from "@/lib/staff/staffActions";
import type { StaffRole } from "@/lib/staff/staffSession";
import type { StaffMember, StaffSessionSummary } from "@/lib/types/staff";
import { formatDateTime } from "@/lib/utils/dateTimeDisplay";

type StaffMemberDetailProps = {
  member: StaffMember;
  sessions: StaffSessionSummary[];
  canEditProfile: boolean;
};

type UserAccessRole = Extract<
  StaffRole,
  "owner" | "managing_partner" | "store_manager" | "assistant_manager" | "cashier"
>;

const initialState: StaffActionState = {
  message: "",
  status: "idle",
};

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
  canEditProfile,
}: StaffMemberDetailProps) {
  const { t } = useLanguage();
  const labels = t.admin.userAccess;
  const [resetState, resetAction] = useActionState(
    resetStaffPinAction,
    initialState,
  );
  const roleLabels: Record<UserAccessRole, string> = {
    owner: labels.roles.owner,
    managing_partner: labels.roles.managingPartner,
    store_manager: labels.roles.storeManager,
    assistant_manager: labels.roles.assistantManager,
    cashier: labels.roles.cashier,
  };
  const visibleRoles = Object.keys(roleLabels) as UserAccessRole[];
  const roleLabel = visibleRoles.includes(member.role as UserAccessRole)
    ? roleLabels[member.role as UserAccessRole]
    : labels.table.unassigned;
  const activeSessions = sessions.filter((session) => !session.revoked_at).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
      <div className="space-y-6">
        <DetailCard title={labels.detail.profile}>
          {canEditProfile ? (
            <Link
              href={`/admin/staff/${member.id}/edit`}
              className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
            >
              {labels.detail.editUser}
            </Link>
          ) : null}
          <Row label={labels.detail.accessId} value={member.employee_number} />
          <Row
            label={labels.detail.name}
            value={`${member.first_name} ${member.last_name}`}
          />
          <Row
            label={labels.detail.displayName}
            value={member.display_name ?? labels.detail.pending}
          />
          <Row label={labels.detail.role} value={roleLabel} />
          <Row
            label={labels.detail.location}
            value={member.assigned_location_name ?? labels.table.unassigned}
          />
          <Row
            label={labels.detail.status}
            value={member.active ? labels.filters.active : labels.filters.inactive}
          />
        </DetailCard>

        <DetailCard title={labels.detail.security}>
          <Row
            label={labels.detail.lastLogin}
            value={
              member.last_login_at
                ? formatDateTime(member.last_login_at)
                : labels.table.never
            }
          />
          <Row
            label={labels.detail.failedAttempts}
            value={String(member.failed_login_attempts)}
          />
          <Row
            label={labels.detail.lockedUntil}
            value={
              member.locked_until
                ? formatDateTime(member.locked_until)
                : labels.table.unlocked
            }
          />
          <Row
            label={labels.detail.mustChangePin}
            value={member.must_change_pin ? labels.detail.yes : labels.detail.no}
          />
          <Row
            label={labels.detail.activeSessions}
            value={String(activeSessions)}
          />
        </DetailCard>
      </div>

      <div className="space-y-6">
        <DetailCard title={labels.detail.resetPin}>
          <form action={resetAction} className="space-y-3">
            <input type="hidden" name="staffMemberId" value={member.id} />
            <p className="text-sm leading-6 text-[#e8dcc8]/60">
              {labels.detail.resetPinHelp}
            </p>
            <input
              name="temporaryPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={labels.detail.temporaryPin}
              className="min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
            />
            <input
              name="confirmTemporaryPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={labels.detail.confirmTemporaryPin}
              className="min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
            />
            <button className="min-h-11 border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]">
              {labels.detail.resetPin}
            </button>
            {resetState.message ? <p>{resetState.message}</p> : null}
          </form>
        </DetailCard>

        <DetailCard title={labels.table.access}>
          <form action={member.active ? deactivateStaffAction : reactivateStaffAction}>
            <input type="hidden" name="staffMemberId" value={member.id} />
            <input
              type="hidden"
              name="reason"
              value="Access changed from User Access detail."
            />
            <button className="min-h-11 border border-[#d8a344]/55 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]">
              {member.active ? labels.detail.deactivate : labels.detail.activate}
            </button>
          </form>
        </DetailCard>
      </div>
    </div>
  );
}
