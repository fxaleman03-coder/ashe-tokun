import AdminShell from "@/components/admin/AdminShell";
import { getSupabaseEnvironmentStatus } from "@/lib/supabase/server";

const plannedModules = [
  "Brands",
  "Suppliers",
  "Products",
  "Media Assets",
  "Inventory",
  "Customers",
  "Orders",
  "Payments",
];

const architectureDomains = [
  "Core Catalog",
  "Media",
  "Inventory",
  "Sales",
  "Operations",
  "Admin / Audit",
];

const businessReviewCards = [
  "Store Model",
  "Brand Model",
  "Inventory Model",
  "Sales Model",
  "Future Operations",
  "Migration Strategy",
];

function StatusCard({
  label,
  configured,
}: {
  label: string;
  configured: boolean;
}) {
  return (
    <article className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
        {label}
      </p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="font-serif text-2xl font-semibold text-[#f7ead2]">
          {configured ? "Configured" : "Missing"}
        </p>
        <span
          className={`h-3 w-3 rounded-full ${
            configured ? "bg-[#d8a344]" : "bg-[#e8dcc8]/28"
          }`}
        />
      </div>
    </article>
  );
}

export default function AdminDatabasePage() {
  const environmentStatus = getSupabaseEnvironmentStatus();

  return (
    <AdminShell
      title="Supabase Foundation"
      description="Database integration is prepared while local catalog behavior remains active."
    >
      <div className="space-y-6">
        <section>
          <p className="mb-4 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Environment Status
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <StatusCard
              label="Supabase URL"
              configured={environmentStatus.hasUrl}
            />
            <StatusCard
              label="Supabase anon key"
              configured={environmentStatus.hasAnonKey}
            />
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Database Modules Planned
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Local-first foundation
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Draft Schema
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {plannedModules.map((moduleName) => (
              <article
                key={moduleName}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {moduleName}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#e8dcc8]/42">
                  Planned
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Database Architecture v1
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Store, brands, inventory, and receipts
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Phase 3.2
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {architectureDomains.map((domain) => (
              <article
                key={domain}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {domain}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#e8dcc8]/42">
                  Planned domain
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Phase 3.3 Business Data Model Review
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Business rules before schema approval
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Pending Approval
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {businessReviewCards.map((card) => (
              <article
                key={card}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {card}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                  Reviewed / Pending Approval
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#d8a344]/25 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="font-serif text-2xl font-semibold text-[#f7ead2]">
            Database integration is prepared but local catalog behavior remains
            active.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/58">
            Product Studio, POS, Product Wizard, and storefront catalog flows
            continue using the existing local seed data and browser-local
            overrides until a future integration phase connects persistence.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
