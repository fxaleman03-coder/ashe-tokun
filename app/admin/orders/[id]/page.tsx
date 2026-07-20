import Link from "next/link";
import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import OrderDetailActions from "@/components/admin/OrderDetailActions";
import { getOrderDetail } from "@/lib/data/ordersRepository";
import {
  getReturnItems,
  getReturnsByOrder,
} from "@/lib/data/returnsRepository";
import {
  getFulfillableOrderItems,
  getShipmentEvents,
  getShipmentsByOrder,
} from "@/lib/data/shippingRepository";
import {
  launchContainment,
  launchContainmentMessages,
} from "@/lib/launchContainment";
import { requirePermission } from "@/lib/staff/permissionGuard";
import en from "@/lib/translations/en";

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

type HeaderDetail = {
  label: string;
  value: ReactNode;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  await requirePermission("orders.read");

  const order = await getOrderDetail(id);

  if (!order) {
    return (
      <AdminShell
        title="Order Not Found"
        description="This order is not available."
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

  const linkedReturns = await getReturnsByOrder(order.id);
  const [linkedShipments, fulfillableItems] = await Promise.all([
    getShipmentsByOrder(order.id),
    getFulfillableOrderItems(order.id),
  ]);
  const linkedShipmentEvents = Object.fromEntries(
    await Promise.all(
      linkedShipments.map(async (shipment) => [
        shipment.id,
        await getShipmentEvents(shipment.id),
      ] as const),
    ),
  );
  const linkedReturnItems = Object.fromEntries(
    await Promise.all(
      linkedReturns.map(async (returnRecord) => [
        returnRecord.id,
        await getReturnItems(returnRecord.id),
      ] as const),
    ),
  );
  const isWebsitePendingPricing = order.isWebsitePendingPricing;
  const pendingPricingLabels = en.storefront;
  const orderLabels = en.admin.orders;

  return (
    <AdminShell
      title={order.order_number}
      description="Manage status, notes, payment visibility, timeline, and inventory impact."
    >
      <div className="space-y-6">
        <Link
          href="/admin/orders"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Orders
        </Link>

        <section className="border border-[#d8a344]/20 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Order Header
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold text-[#f7ead2]">
                {order.order_number}
              </h1>
              <p className="mt-3 text-sm text-[#e8dcc8]/62">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="grid gap-3 text-sm text-[#e8dcc8]/72 sm:grid-cols-2">
              {(
                [
                  { label: "Channel", value: order.sales_channel },
                  { label: "Order Status", value: order.order_status },
                  { label: "Payment Status", value: order.payment_status },
                  { label: "Fulfillment", value: order.fulfillment_status },
                  {
                    label: "Customer",
                    value: (
                      <div>
                        {order.customer_id ? (
                          <Link
                            href={`/admin/customers/${order.customer_id}`}
                            className="text-[#d8a344] transition hover:text-[#f7ead2]"
                          >
                            {order.customer}
                          </Link>
                        ) : (
                          order.customer
                        )}
                        {order.customer_contact ? (
                          <p className="mt-1 text-xs text-[#e8dcc8]/50">
                            Primary Contact: {order.customer_contact}
                          </p>
                        ) : null}
                      </div>
                    ),
                  },
                  { label: "Receipt", value: order.receipt_number ?? "Pending" },
                ] satisfies HeaderDetail[]
              ).map(({ label, value }) => (
                <div key={label} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                    {label}
                  </p>
                  <div className="mt-2">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <OrderDetailActions order={order} />

        {isWebsitePendingPricing ? (
          <section className="border border-[#d8a344]/35 bg-[#2a1d0f] p-5 text-sm leading-6 text-[#f7ead2] shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
              {orderLabels.table.paymentPending}
            </p>
            <p className="mt-3">
              {orderLabels.messages.websitePendingPricingNotice}
            </p>
          </section>
        ) : null}

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
          <DetailCard title="Totals">
            <div className="space-y-3 text-sm text-[#e8dcc8]/72">
              <p className="flex justify-between gap-4">
                <span>
                  {isWebsitePendingPricing
                    ? pendingPricingLabels.cart.itemSubtotal
                    : pendingPricingLabels.cart.subtotal}
                </span>
                <span>{formatCurrency(order.subtotal)}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount_total)}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span>Tax</span>
                <span>
                  {isWebsitePendingPricing
                    ? pendingPricingLabels.confirmation.taxPendingCalculation
                    : formatCurrency(order.tax_total)}
                </span>
              </p>
              {isWebsitePendingPricing ? (
                <p className="flex justify-between gap-4">
                  <span>{pendingPricingLabels.cart.shipping}</span>
                  <span>
                    {pendingPricingLabels.confirmation.shippingPendingCalculation}
                  </span>
                </p>
              ) : null}
              <p className="flex justify-between gap-4 border-t border-[#f7ead2]/10 pt-3 font-serif text-xl text-[#f7ead2]">
                <span>
                  {isWebsitePendingPricing
                    ? orderLabels.table.currentEstimatedAmount
                    : "Grand Total"}
                </span>
                <span>{formatCurrency(order.grand_total)}</span>
              </p>
              {isWebsitePendingPricing ? (
                <p className="text-xs leading-5 text-[#d8a344]">
                  {pendingPricingLabels.confirmation.finalAmountWillBeConfirmed}
                </p>
              ) : null}
            </div>
          </DetailCard>

          <DetailCard title="Payments">
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
                    <p className="mt-2 text-xs text-[#e8dcc8]/48">
                      Received:{" "}
                      {payment.received_at
                        ? new Date(payment.received_at).toLocaleString()
                        : "Pending"}
                    </p>
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
                    <p className="mt-2 text-xs text-[#e8dcc8]/48">
                      Created: {new Date(receipt.created_at).toLocaleString()}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/orders/${order.id}/receipt`}
                        className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        View Receipt
                      </Link>
                      <Link
                        href={`/admin/orders/${order.id}/receipt?mode=reprint`}
                        className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                      >
                        Reprint Receipt
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#e8dcc8]/54">No receipt row found.</p>
            )}
          </DetailCard>
        </div>

        <DetailCard title="Inventory Impact">
          {order.inventoryTransactions.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {order.inventoryTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/72"
                >
                  <p className="font-medium capitalize text-[#f7ead2]">
                    {transaction.transaction_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-2">
                    Qty {transaction.quantity_change} / Balance{" "}
                    {transaction.balance_after}
                  </p>
                  <p className="mt-2 text-xs text-[#d8a344]">
                    {transaction.notes ?? "No notes"}
                  </p>
                  <p className="mt-2 text-xs text-[#e8dcc8]/42">
                    {new Date(transaction.created_at).toLocaleString()}
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

        <DetailCard title="Returns & Exchanges">
          <div className="mb-5 flex justify-end">
            {order.order_status !== "draft" && order.order_status !== "cancelled" ? (
              <Link
                href="/admin/returns/new"
                className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
              >
                Create Return
              </Link>
            ) : null}
          </div>
          {linkedReturns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                    <th className="px-4 py-3">Return</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">View</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedReturns.map((returnRecord) => (
                    <tr
                      key={returnRecord.id}
                      className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium text-[#f7ead2]">
                        {returnRecord.return_number}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {returnRecord.return_type.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">{returnRecord.status}</td>
                      <td className="px-4 py-3">
                        {(linkedReturnItems[returnRecord.id] ?? [])
                          .map((item) => `${item.quantity} x ${item.product_name}`)
                          .join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(returnRecord.refund_total)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/returns/${returnRecord.id}`}
                          className="text-[#d8a344] transition hover:text-[#f7ead2]"
                        >
                          View Return
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[#e8dcc8]/54">
              No returns or exchanges are linked to this order yet.
            </p>
          )}
        </DetailCard>

        <DetailCard title="Shipping & Fulfillment">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#e8dcc8]/58">
              Fulfillment summary: {order.fulfillment_status}
            </p>
            {fulfillableItems.some(
              (item) => item.remaining_fulfillable_quantity > 0,
            ) && !launchContainment.shipmentCreation ? (
              <Link
                href="/admin/shipping/new"
                className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
              >
                Create Shipment
              </Link>
            ) : launchContainment.shipmentCreation ? (
              <span className="inline-flex min-h-10 cursor-not-allowed items-center justify-center border border-[#f7ead2]/10 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/34">
                {launchContainmentMessages.shipmentCreation}
              </span>
            ) : null}
          </div>
          {linkedShipments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                    <th className="px-4 py-3">Shipment</th>
                    <th className="px-4 py-3">Fulfillment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Carrier</th>
                    <th className="px-4 py-3">Tracking</th>
                    <th className="px-4 py-3">Shipped</th>
                    <th className="px-4 py-3">Delivered</th>
                    <th className="px-4 py-3">View</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedShipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium text-[#f7ead2]">
                        {shipment.shipment_number}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {shipment.fulfillment_type.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {shipment.shipment_status.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.carrier ?? "Pending"}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.tracking_url ? (
                          <a
                            href={shipment.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#d8a344] transition hover:text-[#f7ead2]"
                          >
                            {shipment.tracking_number ?? "Track"}
                          </a>
                        ) : (
                          shipment.tracking_number ?? "Pending"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.shipped_at
                          ? new Date(shipment.shipped_at).toLocaleDateString()
                          : "Pending"}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.delivered_at
                          ? new Date(shipment.delivered_at).toLocaleDateString()
                          : "Pending"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/shipping/${shipment.id}`}
                          className="text-[#d8a344] transition hover:text-[#f7ead2]"
                        >
                          View Shipment
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[#e8dcc8]/54">
              No shipments are linked to this order yet.
            </p>
          )}
        </DetailCard>

        <DetailCard title="Timeline">
          <div className="space-y-3">
            {[
              ...order.timeline,
              ...linkedReturns.map((returnRecord) => ({
                id: `return-${returnRecord.id}`,
                label: "Linked Return",
                description: `${returnRecord.return_number} / ${returnRecord.return_type.replace("_", " ")} / ${returnRecord.status}`,
                created_at: returnRecord.created_at,
              })),
              ...linkedShipments.flatMap((shipment) => [
                {
                  id: `shipment-${shipment.id}`,
                  label: "Shipment Created",
                  description: `${shipment.shipment_number} / ${shipment.fulfillment_type.replace("_", " ")} / ${shipment.shipment_status}`,
                  created_at: shipment.created_at,
                },
                ...(linkedShipmentEvents[shipment.id] ?? []).map((event) => ({
                  id: `shipment-event-${event.id}`,
                  label: "Shipment Event",
                  description: `${shipment.shipment_number} / ${event.event_type.replaceAll("_", " ")} / ${event.status.replace("_", " ")}. ${event.description ?? ""}`,
                  created_at: event.event_time,
                })),
              ]),
            ]
              .sort(
                (first, second) =>
                  new Date(first.created_at).getTime() -
                  new Date(second.created_at).getTime(),
              )
              .map((event) => (
              <div
                key={event.id}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/72"
              >
                <p className="font-medium text-[#f7ead2]">{event.label}</p>
                <p className="mt-2">{event.description}</p>
                <p className="mt-2 text-xs text-[#d8a344]">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </DetailCard>
      </div>
    </AdminShell>
  );
}
