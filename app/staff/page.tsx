import StaffCommandCenter from "@/components/staff/StaffCommandCenter";
import { getStaffCommandCenterMetrics } from "@/lib/staff/staffMetrics";
import {
  getAllowedStaffModules,
} from "@/lib/staff/staffSession";
import { requireAuthenticatedStaff } from "@/lib/staff/staffAuthService";

export default async function StaffCommandCenterPage() {
  const session = await requireAuthenticatedStaff();
  const [metrics] = await Promise.all([getStaffCommandCenterMetrics()]);
  const modules = getAllowedStaffModules(session);

  return (
    <StaffCommandCenter
      session={session}
      modules={modules}
      metrics={metrics}
    />
  );
}
