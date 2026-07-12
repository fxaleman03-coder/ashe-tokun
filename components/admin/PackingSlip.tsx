import type {
  Shipment,
  ShipmentAddress,
  ShipmentItem,
} from "@/lib/types/shipping";

type PackingSlipProps = {
  shipment: Shipment;
  items: ShipmentItem[];
  addresses: ShipmentAddress[];
};

function formatAddress(address: ShipmentAddress | undefined) {
  if (!address) {
    return "Pending";
  }

  return [
    address.company,
    [address.first_name, address.last_name].filter(Boolean).join(" "),
    address.address1,
    address.address2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function PackingSlip({
  shipment,
  items,
  addresses,
}: PackingSlipProps) {
  const shipTo = addresses.find((address) => address.address_role === "ship_to");

  return (
    <section className="border border-[#f7ead2]/10 bg-[#f7ead2] p-6 text-[#0f0b07]">
      <div className="border-b border-[#0f0b07]/15 pb-4">
        <p className="font-serif text-3xl font-semibold tracking-[0.18em]">
          ASHE TOKUN
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em]">
          Packing Slip
        </p>
      </div>

      <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
        <div>
          <p className="font-bold uppercase tracking-[0.14em]">
            Shipment Number
          </p>
          <p className="mt-1">{shipment.shipment_number}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.14em]">Order Number</p>
          <p className="mt-1">{shipment.order_number ?? "Pending"}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.14em]">Date</p>
          <p className="mt-1">
            {new Date(shipment.created_at).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.14em]">Packages</p>
          <p className="mt-1">{shipment.package_count}</p>
        </div>
      </div>

      <div className="mt-5 whitespace-pre-line border border-[#0f0b07]/15 p-4 text-sm">
        <p className="mb-2 font-bold uppercase tracking-[0.14em]">Ship To</p>
        {shipment.fulfillment_type === "local_pickup"
          ? "Local pickup at ASHE TOKUN"
          : formatAddress(shipTo)}
      </div>

      <table className="mt-5 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#0f0b07]/15">
            <th className="py-2">Item</th>
            <th className="py-2">SKU</th>
            <th className="py-2 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[#0f0b07]/10">
              <td className="py-2">{item.product_name}</td>
              <td className="py-2">{item.sku ?? "Pending"}</td>
              <td className="py-2 text-right">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {shipment.notes ? (
        <div className="mt-5 border border-[#0f0b07]/15 p-4 text-sm">
          <p className="mb-2 font-bold uppercase tracking-[0.14em]">Notes</p>
          <p>{shipment.notes}</p>
        </div>
      ) : null}
    </section>
  );
}
