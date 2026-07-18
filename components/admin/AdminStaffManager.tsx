"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  deactivateStaffAction,
  reactivateStaffAction,
} from "@/lib/staff/staffActions";
import type { StaffRole } from "@/lib/staff/staffSession";
import type { StaffMember, StaffMetrics } from "@/lib/types/staff";
import { formatDateTime } from "@/lib/utils/dateTimeDisplay";

type AdminStaffManagerProps = {
  staff: StaffMember[];
  metrics: StaffMetrics;
  currentTime: number;
};

type UserAccessRole = Extract<
  StaffRole,
  "owner" | "managing_partner" | "store_manager" | "assistant_manager" | "cashier"
>;

const visibleRoleValues: UserAccessRole[] = [
  "owner",
  "managing_partner",
  "store_manager",
  "assistant_manager",
  "cashier",
];

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
        {value}
      </p>
    </article>
  );
}

export default function AdminStaffManager({
  staff,
  metrics,
  currentTime,
}: AdminStaffManagerProps) {
  const { t } = useLanguage();
  const labels = t.admin.userAccess;
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [lockFilter, setLockFilter] = useState("all");
  const inactiveUsers = Math.max(metrics.totalStaff - metrics.activeStaff, 0);

  const roleLabels: Record<UserAccessRole, string> = {
    owner: labels.roles.owner,
    managing_partner: labels.roles.managingPartner,
    store_manager: labels.roles.storeManager,
    assistant_manager: labels.roles.assistantManager,
    cashier: labels.roles.cashier,
  };

  const filteredStaff = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return staff.filter((member) => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      const displayName = member.display_name?.toLowerCase() ?? "";
      const isLocked =
        member.locked_until !== null &&
        new Date(member.locked_until).getTime() > currentTime;

      return (
        (!normalizedSearch ||
          member.employee_number.toLowerCase().includes(normalizedSearch) ||
          fullName.includes(normalizedSearch) ||
          displayName.includes(normalizedSearch)) &&
        (role === "all" || member.role === role) &&
        (activeFilter === "all" ||
          (activeFilter === "active" ? member.active : !member.active)) &&
        (lockFilter === "all" ||
          (lockFilter === "locked" ? isLocked : !isLocked))
      );
    });
  }, [activeFilter, currentTime, lockFilter, role, search, staff]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={labels.metrics.totalUsers} value={metrics.totalStaff} />
        <StatCard label={labels.metrics.activeUsers} value={metrics.activeStaff} />
        <StatCard label={labels.metrics.inactiveUsers} value={inactiveUsers} />
        <StatCard label={labels.metrics.lockedUsers} value={metrics.lockedStaff} />
      </section>

      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              {labels.title}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#f7ead2]">
              {labels.description}
            </h2>
          </div>
          <Link
            href="/admin/staff/new"
            className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
          >
            {labels.newUser}
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.filters.searchUsers}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70 md:col-span-2"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            <option value="all">{labels.filters.allRoles}</option>
            {visibleRoleValues.map((roleValue) => (
              <option key={roleValue} value={roleValue}>
                {roleLabels[roleValue]}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            <option value="all">{labels.filters.allAccessStatuses}</option>
            <option value="active">{labels.filters.active}</option>
            <option value="inactive">{labels.filters.inactive}</option>
          </select>
          <select
            value={lockFilter}
            onChange={(event) => setLockFilter(event.target.value)}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70 md:col-span-4 lg:col-span-1"
          >
            <option value="all">
              {labels.filters.locked} / {labels.filters.unlocked}
            </option>
            <option value="locked">{labels.filters.locked}</option>
            <option value="unlocked">{labels.filters.unlocked}</option>
          </select>
        </div>
      </section>

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
          <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
            <tr>
              <th className="px-4 py-4">{labels.table.accessId}</th>
              <th className="px-4 py-4">{labels.table.user}</th>
              <th className="px-4 py-4">{labels.table.role}</th>
              <th className="px-4 py-4">{labels.table.location}</th>
              <th className="px-4 py-4">{labels.table.access}</th>
              <th className="px-4 py-4">{labels.table.lastLogin}</th>
              <th className="px-4 py-4">{labels.table.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7ead2]/10">
            {filteredStaff.map((member) => {
              const isLocked =
                member.locked_until !== null &&
                new Date(member.locked_until).getTime() > currentTime;
              const roleLabel = visibleRoleValues.includes(
                member.role as UserAccessRole,
              )
                ? roleLabels[member.role as UserAccessRole]
                : labels.table.unassigned;

              return (
                <tr key={member.id} className="align-top">
                  <td className="px-4 py-4 font-semibold text-[#f7ead2]">
                    {member.employee_number}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#f7ead2]">
                      {member.display_name ||
                        `${member.first_name} ${member.last_name}`}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">{roleLabel}</td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {member.assigned_location_name ?? labels.table.unassigned}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[#e8dcc8]/72">
                      {member.active
                        ? labels.filters.active
                        : labels.filters.inactive}
                    </p>
                    <p className="mt-1 text-xs text-[#e8dcc8]/50">
                      {isLocked
                        ? labels.table.lockedUntil.replace(
                            "{date}",
                            formatDateTime(member.locked_until),
                          )
                        : labels.table.unlocked}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {member.last_login_at
                      ? formatDateTime(member.last_login_at)
                      : labels.table.never}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/staff/${member.id}`}
                        className="border border-[#d8a344]/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        {labels.table.view}
                      </Link>
                      <Link
                        href={`/admin/staff/${member.id}/edit`}
                        className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
                      >
                        {labels.table.edit}
                      </Link>
                      {member.active ? (
                        <form action={deactivateStaffAction}>
                          <input type="hidden" name="staffMemberId" value={member.id} />
                          <input
                            type="hidden"
                            name="reason"
                            value="Access changed from User Access list."
                          />
                          <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                            {labels.table.deactivate}
                          </button>
                        </form>
                      ) : (
                        <form action={reactivateStaffAction}>
                          <input type="hidden" name="staffMemberId" value={member.id} />
                          <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                            {labels.table.activate}
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
