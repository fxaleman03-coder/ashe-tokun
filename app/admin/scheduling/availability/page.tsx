import AdminShell from "@/components/admin/AdminShell";
import StaffAvailabilityManager from "@/components/admin/StaffAvailabilityManager";
import { getStaffMembers } from "@/lib/data/staffRepository";
import { getStaffAvailabilityResult } from "@/lib/data/schedulingRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export const dynamic = "force-dynamic";

export default async function AdminSchedulingAvailabilityPage() {
  await requirePermission("schedule.manage_availability");

  const staff = await getStaffMembers();
  const availabilityResults = await Promise.all(
    staff.map((member) => getStaffAvailabilityResult(member.id)),
  );
  const availability = availabilityResults.flatMap((result) => result.data);
  const availabilityError = availabilityResults
    .map((result) => result.error)
    .filter(Boolean)
    .join(" / ");

  return (
    <AdminShell
      title="Staff Availability"
      description="Manage recurring weekly availability for ASHE TOKUN employees."
    >
      <StaffAvailabilityManager
        staff={staff}
        availability={availability}
        availabilityError={availabilityError || undefined}
      />
    </AdminShell>
  );
}
