import StaffCommandCenter from "@/components/staff/StaffCommandCenter";
import { getStaffMemberById } from "@/lib/data/staffRepository";
import { getStaffCommandCenterMetrics } from "@/lib/staff/staffMetrics";
import {
  getAllowedStaffModules,
} from "@/lib/staff/staffSession";
import { requireAuthenticatedStaff } from "@/lib/staff/staffAuthService";

export default async function StaffCommandCenterPage() {
  const session = await requireAuthenticatedStaff();
  const [metrics, staffProfile] = await Promise.all([
    getStaffCommandCenterMetrics(),
    getStaffMemberById(session.staffId),
  ]);
  const modules = getAllowedStaffModules(session);

  return (
    <StaffCommandCenter
      session={session}
      businessTitle={staffProfile?.business_title ?? null}
      modules={modules}
      metrics={metrics}
    />
  );
}
