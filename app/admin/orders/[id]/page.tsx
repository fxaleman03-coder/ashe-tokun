import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { getPosOrderDetail } from "@/lib/data/posRepository";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getPosOrderDetail(id);

  if (!order) {
    return (
      <AdminShell
        title="Order Not Found"
        description="This POS order is not available."
      >
        <Link
          href="/admin/orders"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Orders
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={order.order_number}
      description="Read-only order summary, payment, receipt, and inventory references."
    >
      <div className="space-y-6">
        <Link
          href="/admin/orders"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Orders
        </Link>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Customer", order.customer_name],
            ["Sales Channel", order.sales_channel],
            ["Order Status", order.order_status],
            ["Payment Status", order.payment_status],
            ["Subtotal", formatCurrency(order.subtotal)],
            ["Discount", formatCurrency(order.discount_total)],
            ["Tax", formatCurrency(order.tax_total)],
            ["Total", formatCurrency(order.grand_total)],
          ].map(([label, value]) => (
            <article
              key={label}
              className="border border-[#f7ead2]/10 bg-[#120d08] p-5"
            >
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                {label}
              </p>
              <p className="mt-2 text-sm text-[#e8dcc8]/74">{value}</p>
            </article>
          ))}
        </div>

        <DetailCard title="Items">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Tax</th>
                  <th className="px-4 py-3">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-[#f7ead2]">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3">{item.brand_name ?? "Unassigned"}</td>
                    <td className="px-4 py-3">{item.sku ?? "Pending"}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.discount)}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(item.tax)}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailCard>

        <div className="grid gap-6 xl:grid-cols-3">
          <DetailCard title="Payment">
            {order.payments.length > 0 ? (
              <div className="space-y-3 text-sm text-[#e8dcc8]/72">
                {order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
                  >
                    <p className="text-[#f7ead2]">
                      {payment.payment_method} / {payment.payment_status}
                    </p>
                    <p className="mt-2">{formatCurrency(payment.amount)}</p>
                    {payment.reference_number ? (
                      <p className="mt-2 text-xs text-[#d8a344]">
                        {payment.reference_number}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#e8dcc8]/54">No payment rows found.</p>
            )}
          </DetailCard>

          <DetailCard title="Receipt">
            {order.receipts.length > 0 ? (
              <div className="space-y-3 text-sm text-[#e8dcc8]/72">
                {order.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
                  >
                    <p className="font-serif text-xl text-[#f7ead2]">
                      {receipt.receipt_number}
                    </p>
                    <p className="mt-2">
                      Printed: {receipt.printed ? "Yes" : "No"} / Emailed:{" "}
                      {receipt.emailed ? "Yes" : "No"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#e8dcc8]/54">No receipt row found.</p>
            )}
          </DetailCard>

          <DetailCard title="Timeline Ready">
            <div className="space-y-3 text-sm text-[#e8dcc8]/72">
              <p>Created: {new Date(order.created_at).toLocaleString()}</p>
              <p>Receipt: {order.receipt_number ?? "Pending"}</p>
              <p>Notes: {order.notes ?? "No notes"}</p>
            </div>
          </DetailCard>
        </div>

        <DetailCard title="Inventory References">
          {order.inventoryTransactions.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {order.inventoryTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/72"
                >
                  <p className="font-medium text-[#f7ead2]">
                    {transaction.transaction_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-2">
                    Qty {transaction.quantity_change} / Balance{" "}
                    {transaction.balance_after}
                  </p>
                  <p className="mt-2 text-xs text-[#d8a344]">
                    {transaction.notes ?? "No notes"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#e8dcc8]/54">
              No inventory ledger rows found for this order yet.
            </p>
          )}
        </DetailCard>
      </div>
    </AdminShell>
  );
}
