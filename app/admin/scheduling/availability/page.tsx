import AdminShell from "@/components/admin/AdminShell";
import StaffAvailabilityManager from "@/components/admin/StaffAvailabilityManager";
import { getStaffMembers } from "@/lib/data/staffRepository";
import { getStaffAvailability } from "@/lib/data/schedulingRepository";

export const dynamic = "force-dynamic";

export default async function AdminSchedulingAvailabilityPage() {
  const staff = await getStaffMembers();
  const availability = (
    await Promise.all(staff.map((member) => getStaffAvailability(member.id)))
  ).flat();

  return (
    <AdminShell
      title="Staff Availability"
      description="Manage recurring weekly availability for ASHE TOKUN employees."
    >
      <StaffAvailabilityManager staff={staff} availability={availability} />
    </AdminShell>
  );
}
