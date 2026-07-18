import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import AdminUserAccessFormPageContent from "@/components/admin/AdminUserAccessFormPageContent";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";
import { getStaffMemberById } from "@/lib/data/staffRepository";
import { requireStaffManagementAccess } from "@/lib/staff/staffAuthService";

type EditStaffMemberPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditStaffMemberPage({
  params,
}: EditStaffMemberPageProps) {
  await requireStaffManagementAccess();
  const { id } = await params;
  const [member, locations] = await Promise.all([
    getStaffMemberById(id),
    getInventoryLocations(),
  ]);

  if (!member) {
    notFound();
  }

  return (
    <AdminShell title="">
      <AdminUserAccessFormPageContent
        mode="edit"
        member={member}
        locations={locations}
      />
    </AdminShell>
  );
}
