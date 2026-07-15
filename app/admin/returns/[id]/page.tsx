import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ReturnDetailManager from "@/components/admin/ReturnDetailManager";
import {
  getReturnById,
  getReturnItems,
  getReturnTimeline,
} from "@/lib/data/returnsRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type ReturnDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReturnDetailPage({ params }: ReturnDetailPageProps) {
  const { id } = await params;
  await requirePermission("returns.read");

  const returnRecord = await getReturnById(id);

  if (!returnRecord) {
    return (
      <AdminShell
        title="Return Not Found"
        description="This return record is not available."
      >
        <Link
          href="/admin/returns"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Returns
        </Link>
      </AdminShell>
    );
  }

  const [items, timeline] = await Promise.all([
    getReturnItems(returnRecord.id),
    getReturnTimeline(returnRecord.id),
  ]);

  return (
    <AdminShell
      title={returnRecord.return_number}
      description="Review returned items, condition, refund or credit handling, inventory impact, and timeline."
    >
      <ReturnDetailManager
        returnRecord={returnRecord}
        items={items}
        timeline={timeline}
      />
    </AdminShell>
  );
}
