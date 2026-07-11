import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { getRecentPosOrders } from "@/lib/data/posRepository";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function AdminOrdersPage() {
  const orders = await getRecentPosOrders(50);

  return (
    <AdminShell
      title="Orders"
      description="Read-only POS order history from the ASHE TOKUN commerce foundation."
    >
      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Date / Time</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Channel</th>
              <th className="px-5 py-4">Items</th>
              <th className="px-5 py-4">Subtotal</th>
              <th className="px-5 py-4">Discount</th>
              <th className="px-5 py-4">Tax</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Payment</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                >
                  <td className="px-5 py-4 font-medium text-[#f7ead2]">
                    {order.order_number}
                    {order.receipt_number ? (
                      <p className="mt-1 text-xs text-[#d8a344]">
                        {order.receipt_number}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">{order.customer_name}</td>
                  <td className="px-5 py-4">{order.sales_channel}</td>
                  <td className="px-5 py-4">{order.item_count}</td>
                  <td className="px-5 py-4">{formatCurrency(order.subtotal)}</td>
                  <td className="px-5 py-4">
                    {formatCurrency(order.discount_total)}
                  </td>
                  <td className="px-5 py-4">{formatCurrency(order.tax_total)}</td>
                  <td className="px-5 py-4">
                    {formatCurrency(order.grand_total)}
                  </td>
                  <td className="px-5 py-4">{order.payment_status}</td>
                  <td className="px-5 py-4">{order.order_status}</td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={12}
                  className="px-5 py-14 text-center text-sm text-[#e8dcc8]/54"
                >
                  No POS orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
