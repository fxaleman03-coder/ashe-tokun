"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { logoutStaffAction } from "@/lib/staff/staffLogoutAction";

type AuthenticatedUserMenuProps = {
  displayName: string;
  employeeNumber?: string;
  businessTitle?: string | null;
  securityRole: string;
  profileHref?: string | null;
  context: "admin" | "staff";
};

function getInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "A";
  const second = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : "";

  return `${first}${second}`.toUpperCase();
}

export default function AuthenticatedUserMenu({
  displayName,
  employeeNumber,
  businessTitle,
  securityRole,
  profileHref,
  context,
}: AuthenticatedUserMenuProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const labels = t.staff.global;
  const initials = getInitials(displayName);
  const resolvedProfileHref =
    profileHref ?? (context === "admin" ? "/admin/staff" : "/staff");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-3 border border-[#f7ead2]/14 bg-[#120d08] px-3 py-2 text-left transition duration-300 hover:border-[#d8a344]/55 hover:bg-[#1a120b] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
      >
        <span className="flex h-9 w-9 items-center justify-center bg-[#d8a344] text-xs font-bold tracking-[0.16em] text-[#0f0b07]">
          {initials}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-semibold text-[#f7ead2]">
            {displayName}
          </span>
          <span className="block truncate text-[0.68rem] uppercase tracking-[0.16em] text-[#e8dcc8]/52">
            {businessTitle || labels.notAssigned}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-80 border border-[#d8a344]/24 bg-[#120d08] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
        >
          <div className="border-b border-[#f7ead2]/10 pb-4">
            <p className="text-sm font-semibold text-[#f7ead2]">{displayName}</p>
            {employeeNumber ? (
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#e8dcc8]/50">
                {employeeNumber}
              </p>
            ) : null}
            <dl className="mt-4 grid gap-2 text-xs">
              <div>
                <dt className="uppercase tracking-[0.16em] text-[#d8a344]">
                  {labels.businessTitle}
                </dt>
                <dd className="mt-1 text-[#e8dcc8]/72">
                  {businessTitle || labels.notAssigned}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.16em] text-[#d8a344]">
                  {labels.securityRole}
                </dt>
                <dd className="mt-1 text-[#e8dcc8]/72">{securityRole}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-3 grid gap-1">
            <Link
              role="menuitem"
              href={resolvedProfileHref}
              className="px-3 py-2 text-sm text-[#e8dcc8]/72 transition duration-300 hover:bg-[#0f0b07] hover:text-[#d8a344] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/60"
            >
              {labels.myProfile}
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled
              className="cursor-not-allowed px-3 py-2 text-left text-sm text-[#e8dcc8]/32"
            >
              {labels.accountSettings}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled
              className="cursor-not-allowed px-3 py-2 text-left text-sm text-[#e8dcc8]/32"
            >
              {labels.activityLog}
            </button>
            <form action={logoutStaffAction}>
              <button
                type="submit"
                role="menuitem"
                className="mt-2 w-full border border-[#d8a344]/40 px-3 py-2 text-left text-sm font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-300 hover:bg-[#d8a344] hover:text-[#0f0b07] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70"
              >
                {labels.signOut}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
