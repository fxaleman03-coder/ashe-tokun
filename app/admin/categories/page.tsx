import AdminShell from "@/components/admin/AdminShell";
import { ManagementTable } from "@/components/admin/CatalogViews";
import { getCategoriesResult } from "@/lib/data/categories";

export default async function AdminCategoriesPage() {
  const categoryReadResult = await getCategoriesResult();
  const categories = categoryReadResult.categories;
  const dataSource =
    categoryReadResult.source === "supabase" ? "Supabase" : "Local fallback";

  return (
    <AdminShell
      title="Categories"
      description="Manage customer-facing product categories used across ASHE TOKUN."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Data Source
            </p>
            <p className="mt-4 font-serif text-3xl font-semibold text-[#f7ead2]">
              {dataSource}
            </p>
          </article>
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Fallback
            </p>
            <p className="mt-4 font-serif text-3xl font-semibold text-[#f7ead2]">
              Available
            </p>
          </article>
        </section>

        <ManagementTable
          rows={categories}
          columns={[
            { label: "Category", render: (category) => category.name },
            { label: "Slug", render: (category) => category.slug },
            {
              label: "Description",
              render: (category) => category.description ?? "Pending",
            },
            {
              label: "Parent",
              render: (category) =>
                category.parent_category_id ?? "Parent placeholder",
            },
            {
              label: "Status",
              render: (category) => (category.active ? "Active" : "Inactive"),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
