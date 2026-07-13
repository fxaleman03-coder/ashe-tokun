import StaffAvailabilityManager from "@/components/admin/StaffAvailabilityManager";
import { getStaffAvailabilityResult } from "@/lib/data/schedulingRepository";
import { getStaffMemberById } from "@/lib/data/staffRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export const dynamic = "force-dynamic";

export default async function StaffAvailabilityPage() {
  const { staff } = await requirePermission("schedule.manage_availability");
  const [member, availabilityResult] = await Promise.all([
    getStaffMemberById(staff.staffId),
    getStaffAvailabilityResult(staff.staffId),
  ]);

  return (
    <div className="min-h-screen bg-[#0f0b07] px-5 py-8 text-[#f7ead2] sm:px-8">
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Availability
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">
            My Availability
          </h1>
          <p className="mt-3 text-sm text-[#e8dcc8]/60">
            Managers can use availability to avoid scheduling conflicts.
          </p>
        </section>
        <StaffAvailabilityManager
          staff={member ? [member] : []}
          availability={availabilityResult.data}
          availabilityError={availabilityResult.error}
          selfStaffId={staff.staffId}
        />
      </main>
    </div>
  );
}
