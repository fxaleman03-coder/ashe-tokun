import type { ReactNode } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getStaffMemberById } from "@/lib/data/staffRepository";
import { requireAdminRouteAccess } from "@/lib/staff/permissionGuard";
import { getSecurityRoleLabel } from "@/lib/staff/roleLabels";

type AdminShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default async function AdminShell({
  title,
  description,
  children,
}: AdminShellProps) {
  const { staff, permissions } = await requireAdminRouteAccess();
  const currentStaff = await getStaffMemberById(staff.staffId);
  const staffName =
    currentStaff?.display_name ||
    `${currentStaff?.first_name ?? ""} ${currentStaff?.last_name ?? ""}`.trim() ||
    staff.displayName ||
    staff.employeeNumber;

  return (
    <div className="min-h-screen bg-[#0f0b07] text-[#f7ead2] lg:flex">
      <AdminSidebar permissions={permissions} />
      <div className="min-w-0 flex-1">
        <AdminHeader
          title={title}
          description={description}
          user={{
            displayName: staffName,
            employeeNumber: staff.employeeNumber,
            businessTitle: currentStaff?.business_title ?? null,
            securityRole: getSecurityRoleLabel(staff.role),
            profileHref: `/admin/staff/${staff.staffId}`,
          }}
        />
        <main className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
