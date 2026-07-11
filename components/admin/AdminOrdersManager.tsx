"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cancelOrder, completeHeldOrder } from "@/lib/data/orderMutations";
import type {
  AdminOrder,
  OrderSummaryMetrics,
  OrderStatus,
  PaymentStatus,
  SalesChannel,
} from "@/lib/data/ordersRepository";

type AdminOrdersManagerProps = {
  orders: AdminOrder[];
  metrics: OrderSummaryMetrics;
};

const inputClass =
  "min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function canCancel(order: AdminOrder) {
  return ["draft", "held", "completed"].includes(order.order_status);
}

function canCompleteHeld(order: AdminOrder) {
  return order.order_status === "held";
}

export default function AdminOrdersManager({
  orders,
  metrics,
}: AdminOrdersManagerProps) {
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState("");
  const [salesChannel, setSalesChannel] = useState<"all" | SalesChannel>("all");
  const [orderStatus, setOrderStatus] = useState<"all" | OrderStatus>("all");
  const [paymentStatus, setPaymentStatus] = useState<"all" | PaymentStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [message, setMessage] = useState("");
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedCustomer = customer.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    return orders.filter((order) => {
      const createdAt = new Date(order.created_at);
      const matchesSearch =
        !normalizedSearch ||
        order.order_number.toLowerCase().includes(normalizedSearch) ||
        order.receipt_number?.toLowerCase().includes(normalizedSearch);
      const matchesCustomer =
        !normalizedCustomer ||
        order.customer.toLowerCase().includes(normalizedCustomer);
      const matchesChannel =
        salesChannel === "all" || order.sales_channel === salesChannel;
      const matchesOrderStatus =
        orderStatus === "all" || order.order_status === orderStatus;
      const matchesPaymentStatus =
        paymentStatus === "all" || order.payment_status === paymentStatus;
      const matchesDateFrom = !fromDate || createdAt >= fromDate;
      const matchesDateTo = !toDate || createdAt <= toDate;

      return (
        matchesSearch &&
        matchesCustomer &&
        matchesChannel &&
        matchesOrderStatus &&
        matchesPaymentStatus &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [
    customer,
    dateFrom,
    dateTo,
    orderStatus,
    orders,
    paymentStatus,
    salesChannel,
    search,
  ]);

  async function handleCancel(order: AdminOrder) {
    const reason = window.prompt(
      "Cancellation reason required. Cancelling a completed order will restore inventory and create reversal ledger entries. Original sale records will remain unchanged.",
    );

    if (!reason) {
      return;
    }

    setWorkingOrderId(order.id);
    setMessage("Cancelling...");

    const result = await cancelOrder(order.id, reason);

    setWorkingOrderId(null);
    setMessage(result.ok ? "Order Cancelled." : `Cancellation Failed: ${result.error}`);
  }

  async function handleCompleteHeld(order: AdminOrder) {
    setWorkingOrderId(order.id);
    setMessage("Completing held order...");

    const result = await completeHeldOrder(order.id);

    setWorkingOrderId(null);
    setMessage(result.ok ? "Held order completed." : result.error);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Orders", metrics.totalOrders],
          ["POS Orders", metrics.posOrders],
          ["Paid Orders", metrics.paidOrders],
          ["Pending Payment", metrics.pendingPaymentOrders],
          ["Completed", metrics.completedOrders],
          ["Held", metrics.heldOrders],
          ["Cancelled", metrics.cancelledOrders],
          ["Revenue", formatCurrency(metrics.totalRevenue)],
        ].map(([label, value]) => (
          <article
            key={label}
            className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
          >
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] md:grid-cols-2 xl:grid-cols-7">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Order or receipt"
          className={inputClass}
        />
        <input
          type="search"
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
          placeholder="Customer"
          className={inputClass}
        />
        <select
          value={salesChannel}
          onChange={(event) =>
            setSalesChannel(event.target.value as "all" | SalesChannel)
          }
          className={inputClass}
        >
          <option value="all">Channel</option>
          {["POS", "Website", "Manual", "Phone", "Marketplace", "Mobile"].map(
            (channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ),
          )}
        </select>
        <select
          value={orderStatus}
          onChange={(event) =>
            setOrderStatus(event.target.value as "all" | OrderStatus)
          }
          className={inputClass}
        >
          <option value="all">Order Status</option>
          {["draft", "completed", "cancelled", "refunded", "held"].map(
            (status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ),
          )}
        </select>
        <select
          value={paymentStatus}
          onChange={(event) =>
            setPaymentStatus(event.target.value as "all" | PaymentStatus)
          }
          className={inputClass}
        >
          <option value="all">Payment</option>
          {["pending", "paid", "partially_paid", "refunded"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className={inputClass}
        />
      </div>

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">Order Number</th>
              <th className="px-5 py-4">Date / Time</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Channel</th>
              <th className="px-5 py-4">Items</th>
              <th className="px-5 py-4">Payment</th>
              <th className="px-5 py-4">Order Status</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Receipt</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                >
                  <td className="px-5 py-4 font-medium text-[#f7ead2]">
                    {order.order_number}
                  </td>
                  <td className="px-5 py-4">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      {order.customer_id ? (
                        <Link
                          href={`/admin/customers/${order.customer_id}`}
                          className="font-medium text-[#d8a344] transition hover:text-[#f7ead2]"
                        >
                          {order.customer}
                        </Link>
                      ) : (
                        <span className="font-medium text-[#f7ead2]">
                          {order.customer}
                        </span>
                      )}
                      {order.customer_contact ? (
                        <p className="mt-1 text-xs text-[#e8dcc8]/50">
                          Primary Contact: {order.customer_contact}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">{order.sales_channel}</td>
                  <td className="px-5 py-4">{order.item_count}</td>
                  <td className="px-5 py-4">{order.payment_status}</td>
                  <td className="px-5 py-4">{order.order_status}</td>
                  <td className="px-5 py-4">
                    {formatCurrency(order.grand_total)}
                  </td>
                  <td className="px-5 py-4">{order.receipt_number ?? "Pending"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        View
                      </Link>
                      {canCancel(order) ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(order)}
                          disabled={workingOrderId === order.id}
                          className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                        >
                          Cancel
                        </button>
                      ) : null}
                      {canCompleteHeld(order) ? (
                        <button
                          type="button"
                          onClick={() => handleCompleteHeld(order)}
                          disabled={workingOrderId === order.id}
                          className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                        >
                          Resume
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="px-5 py-14 text-center text-sm text-[#e8dcc8]/54"
                >
                  No orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
