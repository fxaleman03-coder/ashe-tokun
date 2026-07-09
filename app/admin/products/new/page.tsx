import AdminShell from "@/components/admin/AdminShell";

const fields = [
  "Product Name",
  "SKU",
  "Category",
  "Tradition",
  "Price",
  "Stock",
  "Image Path",
];

export default function AdminNewProductPage() {
  return (
    <AdminShell
      title="New Product"
      description="A visual-only product form for the future catalog management workflow."
    >
      <form className="max-w-4xl border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field} className="block">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                {field}
              </span>
              <input
                type="text"
                className="mt-3 min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
              />
            </label>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Description
          </span>
          <textarea className="mt-3 min-h-36 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-3 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70" />
        </label>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {["Featured", "New Arrival"].map((label) => (
            <label
              key={label}
              className="flex items-center gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-4 text-sm font-medium text-[#e8dcc8]/78"
            >
              <input type="checkbox" className="h-4 w-4 accent-[#d8a344]" />
              {label}
            </label>
          ))}
        </div>

        <button
          type="button"
          className="mt-8 inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-7 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)]"
        >
          Save Product
        </button>
      </form>
    </AdminShell>
  );
}
