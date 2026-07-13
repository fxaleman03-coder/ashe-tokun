import AdminShell from "@/components/admin/AdminShell";
import SchedulePeriodForm from "@/components/admin/SchedulePeriodForm";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";

export const dynamic = "force-dynamic";

export default async function NewSchedulePage() {
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
