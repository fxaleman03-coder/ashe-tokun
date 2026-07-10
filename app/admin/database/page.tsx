import AdminShell from "@/components/admin/AdminShell";
import { USE_SUPABASE } from "@/lib/config";

const environmentChecks = [
  {
    label: "NEXT_PUBLIC_SUPABASE_URL",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  },
  {
    label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },
];

const planningSections = [
  "Stores",
  "Brands",
  "Suppliers",
  "Products",
  "Categories",
  "Collections",
  "Traditions",
  "Media Assets",
  "Inventory",
  "Inventory Transactions",
  "Customers",
  "Customer Addresses",
  "Orders",
  "Order Items",
  "Payments",
  "Receipts",
  "Users",
  "Audit Logs",
];

export default function AdminDatabasePage() {
  return (
    <AdminShell
      title="Supabase Foundation"
      description="Supabase is prepared for future phases while local catalog behavior remains active."
    >
      <div className="space-y-6">
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Environment Status
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Supabase variables
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              USE_SUPABASE: {String(USE_SUPABASE)}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {environmentChecks.map((check) => (
              <article
                key={check.label}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-5"
              >
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                  {check.label}
                </p>
                <p className="mt-4 font-serif text-2xl font-semibold text-[#f7ead2]">
                  {check.configured ? "🟢 Configured" : "🔴 Missing"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Schema Planning
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Comment-only foundation
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              No migrations run
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {planningSections.map((section) => (
              <article
                key={section}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {section}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#e8dcc8]/42">
                  Planned section
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#d8a344]/25 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="font-serif text-2xl font-semibold text-[#f7ead2]">
            Local catalog behavior remains active.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/58">
            Supabase is prepared as a future backend layer only. Product Studio,
            POS, Inventory, Orders, Media Library, and storefront data continue
            using the current local catalog and browser-local overrides.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
