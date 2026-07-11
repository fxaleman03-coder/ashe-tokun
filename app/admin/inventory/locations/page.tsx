import AdminShell from "@/components/admin/AdminShell";
import {
  getInventoryItems,
  getInventoryLocations,
  summarizeInventoryForLocation,
} from "@/lib/data/inventoryRepository";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function InventoryLocationsPage() {
  const [locations, items] = await Promise.all([
    getInventoryLocations(),
    getInventoryItems(),
  ]);
  const summaries = locations.map((location) =>
    summarizeInventoryForLocation(
      location,
      items.filter((item) => item.location_id === location.id),
    ),
  );

  return (
    <AdminShell
      title="Inventory Locations"
      description="Review the stock held across ASHE TOKUN inventory locations."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              Location Control
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#e8dcc8]/62">
              Location creation remains visual-only until the authenticated
              database management phase.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center border border-[#d8a344]/25 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]/55"
          >
            Add Location
          </button>
        </div>

        <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Location Type</th>
                <th className="px-5 py-4">Active</th>
                <th className="px-5 py-4">Total Inventory Items</th>
                <th className="px-5 py-4">Total On Hand</th>
                <th className="px-5 py-4">Total Available</th>
                <th className="px-5 py-4">Inventory Value</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr
                  key={summary.location_id}
                  className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                >
                  <td className="px-5 py-4 font-medium text-[#f7ead2]">
                    {summary.location_name}
                  </td>
                  <td className="px-5 py-4">{summary.location_code}</td>
                  <td className="px-5 py-4">
                    {summary.location_type.replaceAll("_", " ")}
                  </td>
                  <td className="px-5 py-4">
                    {summary.active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-5 py-4">
                    {summary.total_inventory_items}
                  </td>
                  <td className="px-5 py-4">{summary.total_on_hand}</td>
                  <td className="px-5 py-4">{summary.total_available}</td>
                  <td className="px-5 py-4">
                    {formatCurrency(summary.inventory_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
