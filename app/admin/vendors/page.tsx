import AdminShell from "@/components/admin/AdminShell";
import { ManagementTable } from "@/components/admin/CatalogViews";
import { vendors } from "@/lib/catalog";

export default function AdminVendorsPage() {
  return (
    <AdminShell
      title="Vendors"
      description="Manage official ASHE TOKUN brands and artisan partners."
    >
      <ManagementTable
        rows={vendors}
        columns={[
          { label: "Vendor", render: (vendor) => vendor.name },
          { label: "Role", render: (vendor) => vendor.role },
          { label: "Product Count", render: () => "Pending sync" },
          { label: "Status", render: (vendor) => vendor.status },
          {
            label: "Edit",
            render: () => (
              <button
                type="button"
                className="inline-flex min-h-9 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
              >
                Edit
              </button>
            ),
          },
        ]}
      />
    </AdminShell>
  );
}
