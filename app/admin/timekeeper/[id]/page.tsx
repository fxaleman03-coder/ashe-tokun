import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import TimecardDetailManager from "@/components/admin/TimecardDetailManager";
import {
  getExceptionsForTimecard,
  getPunchesForTimecard,
  getTimecardById,
} from "@/lib/data/timekeeperRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type TimecardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function TimecardDetailPage({ params }: TimecardDetailPageProps) {
  const { id } = await params;
  await requirePermission("timekeeper.view_all");

  if (!id || !isUuidLike(id)) {
    return (
      <AdminShell
        title="Timecard Not Available"
        description="Unable to load this timecard because the route id is missing or invalid."
      >
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 text-sm text-[#e8dcc8]/62">
          Unable to load timecard: timecard id is missing or invalid.
        </section>
      </AdminShell>
    );
  }

  const timecard = await getTimecardById(id);

  if (!timecard) {
    notFound();
  }

  const [punches, exceptions] = await Promise.all([
    getPunchesForTimecard(timecard.id),
    getExceptionsForTimecard(timecard.id),
  ]);

  return (
    <AdminShell
      title="Timecard Detail"
      description="Review punches, exceptions, approval status, and corrections for this staff timecard."
    >
      <TimecardDetailManager
        timecard={timecard}
        punches={punches}
        exceptions={exceptions}
      />
    </AdminShell>
  );
}
