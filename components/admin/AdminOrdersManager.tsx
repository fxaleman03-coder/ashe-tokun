"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { cancelOrder, completeHeldOrder } from "@/lib/data/orderMutations";
import { launchContainment } from "@/lib/launchContainment";
import type {
  AdminOrder,
  OrderSummaryMetrics,
  OrderStatus,
  PaymentStatus,
  SalesChannel,
} from "@/lib/data/ordersRepository";
import {
  formatDateTime,
  getBusinessDateString,
} from "@/lib/utils/dateTimeDisplay";

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
  if (
    launchContainment.completedOrderCancellation &&
    (order.order_status === "completed" ||
      order.payment_status === "paid" ||
      order.payment_status === "refunded")
  ) {
    return false;
  }

  return ["draft", "held"].includes(order.order_status);
}

function canCompleteHeld(order: AdminOrder) {
  return order.order_status === "held";
}

export default function AdminOrdersManager({
  orders,
  metrics,
}: AdminOrdersManagerProps) {
  const { t } = useLanguage();
  const labels = t.admin.orders;
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
    const fromDate = dateFrom || null;
    const toDate = dateTo || null;

    return orders.filter((order) => {
      const createdDate = getBusinessDateString(order.created_at);
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
      const matchesDateFrom =
        !fromDate || Boolean(createdDate && createdDate >= fromDate);
      const matchesDateTo =
        !toDate || Boolean(createdDate && createdDate <= toDate);

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
    const reason = window.prompt(labels.messages.cancellationPrompt);

    if (!reason) {
      return;
    }

    setWorkingOrderId(order.id);
    setMessage(labels.messages.cancelling);

    const result = await cancelOrder(order.id, reason);

    setWorkingOrderId(null);
    setMessage(
      result.ok
        ? labels.messages.cancelled
        : `${labels.messages.cancellationFailed}: ${result.error}`,
    );
  }

  async function handleCompleteHeld(order: AdminOrder) {
    setWorkingOrderId(order.id);
    setMessage(labels.messages.completingHeld);

    const result = await completeHeldOrder(order.id);

    setWorkingOrderId(null);
    setMessage(result.ok ? labels.messages.heldCompleted : result.error);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [labels.metrics.totalOrders, metrics.totalOrders],
          [labels.metrics.posOrders, metrics.posOrders],
          [labels.metrics.paidOrders, metrics.paidOrders],
          [labels.metrics.pendingPayment, metrics.pendingPaymentOrders],
          [labels.metrics.completed, metrics.completedOrders],
          [labels.metrics.held, metrics.heldOrders],
          [labels.metrics.cancelled, metrics.cancelledOrders],
          [labels.metrics.revenue, formatCurrency(metrics.totalRevenue)],
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
          placeholder={labels.filters.orderOrReceipt}
          className={inputClass}
        />
        <input
          type="search"
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
          placeholder={labels.filters.customer}
          className={inputClass}
        />
        <select
          value={salesChannel}
          onChange={(event) =>
            setSalesChannel(event.target.value as "all" | SalesChannel)
          }
          className={inputClass}
        >
          <option value="all">{labels.filters.channel}</option>
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
          <option value="all">{labels.filters.orderStatus}</option>
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
          <option value="all">{labels.filters.payment}</option>
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
              <th className="px-5 py-4">{labels.table.orderNumber}</th>
              <th className="px-5 py-4">{labels.table.dateTime}</th>
              <th className="px-5 py-4">{labels.table.customer}</th>
              <th className="px-5 py-4">{labels.table.channel}</th>
              <th className="px-5 py-4">{labels.table.items}</th>
              <th className="px-5 py-4">{labels.table.payment}</th>
              <th className="px-5 py-4">{labels.table.orderStatus}</th>
              <th className="px-5 py-4">{labels.table.fulfillment}</th>
              <th className="px-5 py-4">{labels.table.total}</th>
              <th className="px-5 py-4">{labels.table.receipt}</th>
              <th className="px-5 py-4">{labels.table.action}</th>
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
                    {formatDateTime(order.created_at)}
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
                          {labels.table.primaryContact}: {order.customer_contact}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">{order.sales_channel}</td>
                  <td className="px-5 py-4">{order.item_count}</td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <p>{order.payment_status}</p>
                      {order.isWebsitePendingPricing ? (
                        <span className="inline-flex border border-[#d8a344]/35 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#d8a344]">
                          {labels.table.paymentPending}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">{order.order_status}</td>
                  <td className="px-5 py-4">{order.fulfillment_status}</td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <p>{formatCurrency(order.grand_total)}</p>
                      {order.isWebsitePendingPricing ? (
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex border border-[#f7ead2]/12 px-2 py-1 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-[#e8dcc8]/58">
                            {labels.table.estimate}
                          </span>
                          <span className="inline-flex border border-[#d8a344]/35 px-2 py-1 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-[#d8a344]">
                            {labels.table.taxPending}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {order.receipt_number ?? labels.table.pending}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        {labels.table.view}
                      </Link>
                      {order.receipt_number ? (
                        <>
                          <Link
                            href={`/admin/orders/${order.id}/receipt`}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                          >
                            {labels.table.viewReceipt}
                          </Link>
                          <Link
                            href={`/admin/orders/${order.id}/receipt?mode=reprint`}
                            className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                          >
                            {labels.table.reprintReceipt}
                          </Link>
                        </>
                      ) : null}
                      {canCancel(order) ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(order)}
                          disabled={workingOrderId === order.id}
                          className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                        >
                          {labels.table.cancel}
                        </button>
                      ) : launchContainment.completedOrderCancellation &&
                        (order.order_status === "completed" ||
                          order.payment_status === "paid" ||
                          order.payment_status === "refunded") ? (
                        <span className="inline-flex min-h-10 cursor-not-allowed items-center justify-center border border-[#f7ead2]/10 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/34">
                          {t.admin.launchContainment.actionUnavailable}
                        </span>
                      ) : null}
                      {canCompleteHeld(order) ? (
                        <button
                          type="button"
                          onClick={() => handleCompleteHeld(order)}
                          disabled={workingOrderId === order.id}
                          className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                        >
                          {labels.table.resume}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={11}
                  className="px-5 py-14 text-center text-sm text-[#e8dcc8]/54"
                >
                  {labels.table.noMatches}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
