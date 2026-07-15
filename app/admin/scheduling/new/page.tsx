import AdminShell from "@/components/admin/AdminShell";
import SchedulePeriodForm from "@/components/admin/SchedulePeriodForm";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export const dynamic = "force-dynamic";

export default async function NewSchedulePage() {
  await requirePermission("schedule.create");

  const locations = await getInventoryLocations();

  return (
    <AdminShell
      title="New Schedule"
      description="Create a draft ASHE TOKUN staff schedule period. The recommended default is seven days."
    >
      <SchedulePeriodForm locations={locations} />
    </AdminShell>
  );
}
