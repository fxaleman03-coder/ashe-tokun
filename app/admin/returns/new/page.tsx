import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ReturnCreationWizard from "@/components/admin/ReturnCreationWizard";
import {
  getEligibleReturnOrders,
  getReturnableOrderItems,
} from "@/lib/data/returnsRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function NewReturnPage() {
  await requirePermission("returns.create");

  const orders = await getEligibleReturnOrders();
  const returnablePairs = await Promise.all(
    orders.map(async (order) => [
      order.id,
      await getReturnableOrderItems(order.id),
    ] as const),
  );
  const returnableItemsByOrderId = Object.fromEntries(returnablePairs);

  return (
    <AdminShell
      title="New Return"
      description="Find an original order, select returnable items, and create a controlled return request."
    >
      <div className="space-y-6">
        <Link
          href="/admin/returns"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Returns
        </Link>
        <ReturnCreationWizard
          orders={orders}
          returnableItemsByOrderId={returnableItemsByOrderId}
        />
      </div>
    </AdminShell>
  );
}
