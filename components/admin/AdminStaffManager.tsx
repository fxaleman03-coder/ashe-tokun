"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  archiveStaffAction,
  deactivateStaffAction,
  reactivateStaffAction,
  revokeStaffSessionsAction,
  unlockStaffAction,
} from "@/lib/staff/staffActions";
import {
  getSecurityRoleLabel,
  getStaffBusinessTitle,
  isExecutiveRole,
} from "@/lib/staff/roleLabels";
import type { StaffMember, StaffMetrics } from "@/lib/types/staff";
import { formatDateTime } from "@/lib/utils/dateTimeDisplay";

type AdminStaffManagerProps = {
  staff: StaffMember[];
  metrics: StaffMetrics;
  currentTime: number;
};

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
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [employmentStatus, setEmploymentStatus] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [lockFilter, setLockFilter] = useState("all");
  const filteredStaff = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return staff.filter((member) => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      const isLocked =
        member.locked_until !== null &&
        new Date(member.locked_until).getTime() > currentTime;

      return (
        (!normalizedSearch ||
          member.employee_number.toLowerCase().includes(normalizedSearch) ||
          fullName.includes(normalizedSearch) ||
          member.display_name?.toLowerCase().includes(normalizedSearch)) &&
        (role === "all" || member.role === role) &&
        (employmentStatus === "all" ||
          member.employment_status === employmentStatus) &&
        (activeFilter === "all" ||
          (activeFilter === "active" ? member.active : !member.active)) &&
        (lockFilter === "all" ||
          (lockFilter === "locked" ? isLocked : !isLocked))
      );
    });
  }, [
    activeFilter,
    currentTime,
    employmentStatus,
    lockFilter,
    role,
    search,
    staff,
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Staff" value={metrics.totalStaff} />
        <StatCard label="Active" value={metrics.activeStaff} />
        <StatCard label="Locked" value={metrics.lockedStaff} />
        <StatCard label="Archived" value={metrics.archivedStaff} />
        <StatCard label="Managers" value={metrics.managers} />
        <StatCard label="Cashiers" value={metrics.cashiers} />
        <StatCard label="Fulfillment" value={metrics.fulfillment} />
        <StatCard label="Inventory" value={metrics.inventory} />
      </section>

      <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              Staff Management
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#f7ead2]">
              Employees
            </h2>
          </div>
          <Link
            href="/admin/staff/new"
            className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
          >
            New Employee
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff"
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70 md:col-span-2"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="managing_partner">Managing Partner</option>
            <option value="store_manager">Store Manager</option>
            <option value="assistant_manager">Assistant Manager</option>
            <option value="manager">Store Manager (legacy)</option>
            <option value="cashier">Cashier</option>
            <option value="inventory">Inventory Specialist</option>
            <option value="fulfillment">Shipping & Fulfillment</option>
            <option value="customer_service">Customer Service</option>
            <option value="accounting">Accounting</option>
            <option value="marketing_ecommerce">Marketing & E-Commerce</option>
          </select>
          <select
            value={employmentStatus}
            onChange={(event) => setEmploymentStatus(event.target.value)}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
            <option value="retired">Retired</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            <option value="all">Active / Inactive</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={lockFilter}
            onChange={(event) => setLockFilter(event.target.value)}
            className="min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none focus:border-[#d8a344]/70 md:col-span-5 lg:col-span-1"
          >
            <option value="all">Locked / Unlocked</option>
            <option value="locked">Locked</option>
            <option value="unlocked">Unlocked</option>
          </select>
        </div>
      </section>

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="min-w-full divide-y divide-[#f7ead2]/10 text-sm">
          <thead className="bg-[#0f0b07] text-left text-[0.68rem] uppercase tracking-[0.18em] text-[#d8a344]">
            <tr>
              <th className="px-4 py-4">Employee</th>
              <th className="px-4 py-4">Role</th>
              <th className="px-4 py-4">Location</th>
              <th className="px-4 py-4">Access</th>
              <th className="px-4 py-4">Last Login</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7ead2]/10">
            {filteredStaff.map((member) => {
              const isLocked =
                member.locked_until !== null &&
                new Date(member.locked_until).getTime() > currentTime;
              const businessTitle = getStaffBusinessTitle(
                member.role,
                member.business_title,
              );

              return (
                <tr key={member.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#f7ead2]">
                      {member.display_name ||
                        `${member.first_name} ${member.last_name}`}
                    </p>
                    <p className="mt-1 text-xs text-[#e8dcc8]/55">
                      {member.employee_number}
                    </p>
                    {isExecutiveRole(member.role) ? (
                      <p className="mt-2 inline-flex border border-[#d8a344]/45 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#d8a344]">
                        Executive Leadership
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    <span className="block font-semibold text-[#f7ead2]">
                      {businessTitle}
                    </span>
                    <span className="mt-1 block text-xs text-[#e8dcc8]/55">
                      Security: {getSecurityRoleLabel(member.role)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {member.assigned_location_name ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[#e8dcc8]/72">
                      {member.active ? "Active" : "Inactive"} /{" "}
                      {member.employment_status}
                    </p>
                    <p className="mt-1 text-xs text-[#e8dcc8]/50">
                      {isLocked
                        ? `Locked until ${formatDateTime(member.locked_until)}`
                        : "Unlocked"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-[#e8dcc8]/72">
                    {formatDateTime(member.last_login_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/staff/${member.id}`}
                        className="border border-[#d8a344]/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        View
                      </Link>
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
                      {member.active ? (
                        <form action={deactivateStaffAction}>
                          <input type="hidden" name="staffMemberId" value={member.id} />
                          <input
                            type="hidden"
                            name="reason"
                            value="Deactivated from staff list."
                          />
                          <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                            Deactivate
                          </button>
                        </form>
                      ) : (
                        <form action={reactivateStaffAction}>
                          <input type="hidden" name="staffMemberId" value={member.id} />
                          <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                            Reactivate
                          </button>
                        </form>
                      )}
                      <form action={archiveStaffAction}>
                        <input type="hidden" name="staffMemberId" value={member.id} />
                        <input type="hidden" name="archiveStatus" value="archived" />
                        <input
                          type="hidden"
                          name="reason"
                          value="Archived from staff list."
                        />
                        <button className="border border-[#f7ead2]/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]">
                          Archive
                        </button>
                      </form>
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
