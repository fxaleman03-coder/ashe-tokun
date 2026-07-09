import AdminShell from "@/components/admin/AdminShell";

export default function AdminCatalogPage() {
  return (
    <AdminShell
      title="Catalog"
      description="Catalog will manage products, collections, categories, and merchandising."
    >
      <section className="grid gap-5 lg:grid-cols-3">
        {[
          ["Products", "Manage storefront items, prices, images, and display status."],
          ["Collections", "Group products into curated stories and seasonal edits."],
          ["Categories", "Organize the catalog by tradition, product type, and use."],
          ["Merchandising", "Control featured products, badges, and homepage placement."],
        ].map(([title, description]) => (
          <article
            key={title}
            className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-500 ease-out hover:border-[#d8a344]/45 hover:shadow-[0_28px_84px_rgba(0,0,0,0.3),0_0_34px_rgba(216,163,68,0.1)]"
          >
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {title}
            </p>
            <p className="mt-4 text-sm leading-6 text-[#e8dcc8]/64">
              {description}
            </p>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
