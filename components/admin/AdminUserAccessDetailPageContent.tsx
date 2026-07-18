"use client";

import StaffMemberDetail from "@/components/admin/StaffMemberDetail";
import { useLanguage } from "@/components/LanguageProvider";
import type { StaffMember, StaffSessionSummary } from "@/lib/types/staff";

type AdminUserAccessDetailPageContentProps = {
  member: StaffMember;
  sessions: StaffSessionSummary[];
  canEditProfile: boolean;
};

export default function AdminUserAccessDetailPageContent({
  member,
  sessions,
  canEditProfile,
}: AdminUserAccessDetailPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.userAccess;
  const name =
    member.display_name || `${member.first_name} ${member.last_name}`.trim();

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#f7ead2] sm:text-4xl">
          {name || labels.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/66 sm:text-base">
          {labels.userDetailDescription}
        </p>
      </div>

      <StaffMemberDetail
        member={member}
        sessions={sessions}
        canEditProfile={canEditProfile}
      />
    </>
  );
}
