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

const databaseDomains = [
  { label: "Core Catalog", status: "Ready for Migration" },
  { label: "Stores", status: "Planning" },
  { label: "Suppliers", status: "Ready for Migration" },
  { label: "Media Assets", status: "Ready for Migration" },
  { label: "Inventory", status: "Ready for Migration" },
  { label: "Inventory Transactions", status: "Ready for Migration" },
  { label: "Customers", status: "Ready for Migration" },
  { label: "Customer Addresses", status: "Ready for Migration" },
  { label: "Orders", status: "Ready for Migration" },
  { label: "Order Items", status: "Ready for Migration" },
  { label: "Payments", status: "Ready for Migration" },
  { label: "Receipts", status: "Ready for Migration" },
  { label: "Operations", status: "Ready for Migration" },
  { label: "Staff / Audit Logs", status: "Ready for Migration" },
];

const inventoryCards = [
  "Inventory Locations",
  "Inventory Items",
  "Inventory Ledger",
  "Multiple Locations",
  "Transaction History",
];

const salesCards = [
  "Customers",
  "Orders",
  "Order Items",
  "Payments",
  "Receipts",
  "Sales Channels",
  "Historical Sales",
];

const mediaCards = [
  "Media Assets",
  "Product Media",
  "Media Usage",
  "Commerce Assets",
  "Production Assets",
  "Digital Asset Manager",
];

const operationsCards = [
  "Suppliers",
  "Purchase Orders",
  "Receiving",
  "Returns",
  "Discounts",
  "Tax Rates",
  "Gift Cards",
  "Consignment",
  "Vendor Payouts",
  "Staff / Audit Logs",
];

const readinessCards = [
  { label: "Extension Check", status: "Ready" },
  { label: "Table Order", status: "Ready" },
  { label: "Foreign Keys", status: "Ready" },
  { label: "Updated At Triggers", status: "Ready" },
  { label: "Constraints", status: "Ready" },
  { label: "Migration Notes", status: "Ready" },
  { label: "RLS Pending", status: "Pending" },
];

const securityCards = [
  { label: "Public Storefront Access", status: "Planned" },
  { label: "Admin Staff Access", status: "Planned" },
  { label: "POS Staff Access", status: "Planned" },
  { label: "Manager / Owner Access", status: "Planned" },
  { label: "Vendor Portal Future", status: "Planned" },
  { label: "Sensitive Data Protection", status: "Planned" },
  { label: "Audit Logs", status: "Planned" },
  { label: "RLS Not Enabled Yet", status: "Pending Authentication" },
];

const executionChecklistCards = [
  "Pre-Execution",
  "SQL Editor",
  "Post-Execution Verification",
  "Rollback Notes",
  "Next Phases",
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
                Database Architecture
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Core Catalog foundation
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              No migrations run
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {databaseDomains.map((domain) => (
              <article
                key={domain.label}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {domain.label}
                </p>
                <p
                  className={`mt-2 text-xs uppercase tracking-[0.18em] ${
                    domain.status === "Ready for Migration"
                      ? "text-[#d8a344]"
                      : "text-[#e8dcc8]/42"
                  }`}
                >
                  {domain.status}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Inventory Domain
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Transaction-based stock architecture
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Ready for Migration
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {inventoryCards.map((card) => (
              <article
                key={card}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {card}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                  Ready for Migration
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Sales Domain
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                POS, orders, payments, and receipts
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Ready for Migration
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {salesCards.map((card) => (
              <article
                key={card}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {card}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                  Ready for Migration
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Media Domain
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Commerce and production assets
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Ready for Migration
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mediaCards.map((card) => (
              <article
                key={card}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {card}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                  Ready for Migration
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Operations Domain
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Purchasing, returns, discounts, and audit
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Ready for Migration
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {operationsCards.map((card) => (
              <article
                key={card}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {card}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                  Ready for Migration
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Phase 4.7 Migration Readiness
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Manual Supabase execution review
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              RLS Pending
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {readinessCards.map((card) => (
              <article
                key={card.label}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {card.label}
                </p>
                <p
                  className={`mt-2 text-xs uppercase tracking-[0.18em] ${
                    card.status === "Ready"
                      ? "text-[#d8a344]"
                      : "text-[#e8dcc8]/42"
                  }`}
                >
                  {card.status}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Phase 4.8 RLS & Security Planning
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Role-based database access plan
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Planning Only
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {securityCards.map((card) => (
              <article
                key={card.label}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {card.label}
                </p>
                <p
                  className={`mt-2 text-xs uppercase tracking-[0.18em] ${
                    card.status === "Planned"
                      ? "text-[#d8a344]"
                      : "text-[#e8dcc8]/42"
                  }`}
                >
                  {card.status}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
                Phase 4.9 Supabase Execution Checklist
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                First schema execution readiness
              </h2>
            </div>
            <span className="border border-[#d8a344]/25 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
              Checklist Ready
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {executionChecklistCards.map((card) => (
              <article
                key={card}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4"
              >
                <p className="font-serif text-xl font-semibold text-[#f7ead2]">
                  {card}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                  Checklist Ready
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
