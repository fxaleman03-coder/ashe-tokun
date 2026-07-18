"use client";

import StaffMemberForm from "@/components/admin/StaffMemberForm";
import { useLanguage } from "@/components/LanguageProvider";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";
import type { StaffMember } from "@/lib/types/staff";

type AdminUserAccessFormPageContentProps = {
  locations: InventoryLocation[];
  member?: StaffMember;
  mode: "create" | "edit";
};

export default function AdminUserAccessFormPageContent({
  locations,
  member,
  mode,
}: AdminUserAccessFormPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.userAccess;
  const title = mode === "edit" ? labels.editUser : labels.newUser;
  const description =
    mode === "edit" ? labels.editUserDescription : labels.newUserDescription;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#f7ead2] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/66 sm:text-base">
          {description}
        </p>
      </div>

      <StaffMemberForm locations={locations} member={member} mode={mode} />
    </>
  );
}
