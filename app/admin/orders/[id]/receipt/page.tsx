import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import OrderReceiptDocument from "@/components/admin/OrderReceiptDocument";
import OrderReceiptPrintControls from "@/components/admin/OrderReceiptPrintControls";
import { getOrderDetail } from "@/lib/data/ordersRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type OrderReceiptPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export default async function OrderReceiptPage({
  params,
  searchParams,
}: OrderReceiptPageProps) {
  const { id } = await params;
  const { mode } = await searchParams;
  await requirePermission("orders.read");

  const order = await getOrderDetail(id);

  if (!order || !order.receipt_number) {
    return (
      <AdminShell
        title="Receipt Not Found"
        description="This order does not have a receipt available for viewing or reprinting."
      >
        <Link
          href={`/admin/orders/${id}`}
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Order
        </Link>
      </AdminShell>
    );
  }

  const isReprint = mode === "reprint";
  const reprintedAt = isReprint ? new Date().toISOString() : undefined;

  return (
    <AdminShell
      title={isReprint ? "Reprint Receipt" : "View Receipt"}
      description="Review and print the original completed transaction receipt."
    >
      <OrderReceiptPrintControls orderHref={`/admin/orders/${order.id}`} />
      <section className="flex justify-center">
        <OrderReceiptDocument
          order={order}
          isReprint={isReprint}
          reprintedAt={reprintedAt}
        />
      </section>
    </AdminShell>
  );
}
