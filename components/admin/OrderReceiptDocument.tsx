import type { AdminOrderDetail } from "@/lib/data/ordersRepository";
import { formatBusinessDateTime } from "@/lib/utils/dateTimeDisplay";

type OrderReceiptDocumentProps = {
  order: AdminOrderDetail;
  isReprint?: boolean;
  reprintedAt?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getPaymentMethod(order: AdminOrderDetail) {
  return order.payments[0]?.payment_method ?? "pending";
}

function getAmountTendered(order: AdminOrderDetail) {
  const reference = order.payments[0]?.reference_number ?? "";
  const tenderedMatch = reference.match(/Tendered\s+([0-9]+(?:\.[0-9]{1,2})?)/i);

  if (!tenderedMatch) {
    return order.grand_total;
  }

  return Number(tenderedMatch[1]);
}

function getChangeDue(order: AdminOrderDetail) {
  const reference = order.payments[0]?.reference_number ?? "";
  const changeMatch = reference.match(/Change\s+([0-9]+(?:\.[0-9]{1,2})?)/i);

  if (!changeMatch) {
    return 0;
  }

  return Number(changeMatch[1]);
}

export default function OrderReceiptDocument({
  order,
  isReprint = false,
  reprintedAt,
}: OrderReceiptDocumentProps) {
  const receiptNumber = order.receipts[0]?.receipt_number ?? order.receipt_number;
  const amountTendered = getAmountTendered(order);
  const changeDue = getChangeDue(order);

  return (
    <div
      id="pos-receipt-print-root"
      className="pos-receipt-print-root bg-white p-5 font-mono text-sm leading-5 text-black"
    >
      <div className="text-center">
        <p className="text-lg font-bold tracking-[0.18em]">ASHE TOKUN</p>
        <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em]">
          Receipt
        </p>
        {isReprint ? (
          <p className="mt-2 border border-black py-1 text-xs font-bold tracking-[0.18em]">
            REPRINT
          </p>
        ) : null}
        {isReprint && reprintedAt ? (
          <p className="mt-2 text-[0.65rem]">
            Reprinted: {formatBusinessDateTime(reprintedAt)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 border-y border-black py-3 text-xs">
        <div className="flex justify-between gap-3">
          <span>Order</span>
          <span>{order.order_number}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Receipt</span>
          <span>{receiptNumber ?? "Pending"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Date / Time</span>
          <span>{formatBusinessDateTime(order.created_at)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Cashier</span>
          <span>
            {order.inventoryTransactions[0]?.performed_by ?? "Admin"}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Customer</span>
          <span>{order.customer}</span>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {order.items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between gap-3 font-semibold">
              <span>{item.product_name}</span>
              <span>{formatCurrency(item.line_total)}</span>
            </div>
            <div className="mt-1 flex justify-between gap-3 text-xs">
              <span>
                {item.quantity} x {formatCurrency(item.unit_price)}
              </span>
              <span>SKU {item.sku ?? "Pending"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 border-t border-black pt-3">
        <div className="flex justify-between gap-3">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Discount</span>
          <span>-{formatCurrency(order.discount_total)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Tax</span>
          <span>{formatCurrency(order.tax_total)}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-black pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(order.grand_total)}</span>
        </div>
        <div className="flex justify-between gap-3 pt-2">
          <span>Payment</span>
          <span>{getPaymentMethod(order)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Amount Tendered</span>
          <span>{formatCurrency(amountTendered)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Change Due</span>
          <span>{formatCurrency(changeDue)}</span>
        </div>
      </div>

      <p className="mt-5 border-t border-black pt-3 text-center text-xs">
        Thank you for shopping with ASHE TOKUN.
      </p>
    </div>
  );
}
