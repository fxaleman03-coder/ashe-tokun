import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ShipmentCreationWizard from "@/components/admin/ShipmentCreationWizard";
import { getCustomerAddresses } from "@/lib/data/customersRepository";
import {
  getEligibleShippingOrders,
  getFulfillableOrderItems,
} from "@/lib/data/shippingRepository";
import { getShippingOrigins } from "@/lib/data/shippingOriginsRepository";

export default async function NewShipmentPage() {
  const orders = await getEligibleShippingOrders();
  const shippingOrigins = await getShippingOrigins();
  const fulfillableEntries = await Promise.all(
    orders.map(async (order) => [
      order.id,
      await getFulfillableOrderItems(order.id),
    ] as const),
  );
  const uniqueCustomerIds = Array.from(
    new Set(orders.map((order) => order.customer_id).filter(Boolean)),
  ) as string[];
  const addressEntries = await Promise.all(
    uniqueCustomerIds.map(async (customerId) => [
      customerId,
      await getCustomerAddresses(customerId),
    ] as const),
  );

  return (
    <AdminShell
      title="Create Shipment"
      description="Create shipping or local pickup records from eligible orders."
    >
      <div className="mb-6">
        <Link
          href="/admin/shipping"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Shipping
        </Link>
      </div>
      <ShipmentCreationWizard
        orders={orders}
        fulfillableItemsByOrderId={Object.fromEntries(fulfillableEntries)}
        addressesByCustomerId={Object.fromEntries(addressEntries)}
        shippingOrigins={shippingOrigins}
      />
    </AdminShell>
  );
}
