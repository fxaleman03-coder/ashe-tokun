export type ReturnType = "refund" | "exchange" | "store_credit";
export type ReturnStatus =
  | "requested"
  | "approved"
  | "received"
  | "completed"
  | "cancelled";
export type ReturnCondition =
  | "unopened"
  | "sellable"
  | "opened"
  | "damaged"
  | "defective"
  | "missing_parts"
  | "other";
export type RefundMethod = "cash" | "card" | "store_credit" | "other";

export type ReturnRecord = {
  id: string;
  return_number: string;
  order_id: string | null;
  order_number: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_contact: string | null;
  return_type: ReturnType;
  status: ReturnStatus;
  refund_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
};

export type ReturnItem = {
  id: string;
  return_id: string;
  order_item_id: string | null;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  reason: string | null;
  condition: ReturnCondition | null;
  refund_amount: number;
  created_at: string;
};

export type ReturnableOrderItem = {
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity_purchased: number;
  quantity_already_returned: number;
  quantity_returnable: number;
  unit_price: number;
  line_total: number;
  original_inventory_location_id: string | null;
};

export type ReturnItemInput = {
  order_item_id: string;
  quantity: number;
  reason: string;
  condition?: ReturnCondition;
  refund_amount?: number;
};

export type ReturnInput = {
  order_id: string;
  return_type: ReturnType;
  reason: string;
  notes?: string;
  items: ReturnItemInput[];
};

export type ReceivedReturnItemInput = {
  return_item_id: string;
  quantity_received: number;
  condition: ReturnCondition;
  restock: boolean;
  notes?: string;
};

export type ReturnRefundInput = {
  refund_method: RefundMethod;
  amount: number;
  notes?: string;
};

export type ExchangeInput = {
  replacement_value?: number;
  returned_value?: number;
  price_difference?: number;
  notes?: string;
};

export type StoreCreditInput = {
  amount: number;
  notes?: string;
};

export type ReturnCompletionInput = {
  refund?: ReturnRefundInput;
  exchange?: ExchangeInput;
  storeCredit?: StoreCreditInput;
  restockItems?: {
    return_item_id: string;
    restock: boolean;
    condition: ReturnCondition;
    notes?: string;
  }[];
  notes?: string;
};

export type ReturnResult =
  | { ok: true; message: string; returnId?: string; returnNumber?: string }
  | { ok: false; error: string; critical?: boolean; returnId?: string };

export type ReturnMetrics = {
  totalReturns: number;
  requestedReturns: number;
  approvedReturns: number;
  receivedReturns: number;
  completedReturns: number;
  cancelledReturns: number;
  refundReturns: number;
  exchangeReturns: number;
  storeCreditReturns: number;
  totalRefunded: number;
  totalReturnedUnits: number;
};

export type ReturnFilters = {
  search?: string;
  orderNumber?: string;
  customer?: string;
  returnType?: ReturnType | "all";
  returnStatus?: ReturnStatus | "all";
  dateFrom?: string;
  dateTo?: string;
  minimumRefundAmount?: number;
  maximumRefundAmount?: number;
};

export type ReturnTimelineEvent = {
  id: string;
  label: string;
  description: string;
  created_at: string;
};
