import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";

const settings = [
  ["Store Name", "ASHE TOKUN"],
  ["Store Mode", "Operational admin"],
  ["Primary Currency", "USD"],
  ["Fulfillment", "Shipping origins managed separately"],
];

export default function AdminSettingsPage() {
  return (
    <AdminShell
      title="Settings"
      description="Production settings currently expose shipping-origin management. Other store settings are read-only until dedicated controls are enabled."
    >
      <section className="grid gap-5 lg:grid-cols-2">
        {settings.map(([label, value]) => (
          <article
            key={label}
            className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
          >
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-4 text-lg font-medium text-[#f7ead2]">{value}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#e8dcc8]/42">
              Read-only
            </p>
          </article>
        ))}
      </section>
      <section className="mt-6 border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
          Fulfillment Settings
        </p>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-[#f7ead2]">
          Shipping Origins
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#e8dcc8]/58">
          Manage ship-from origins for ASHE TOKUN, AJAKO ORIGINALS, EDIBERE
          CREATION, and future fulfillment locations.
        </p>
        <Link
          href="/admin/settings/shipping-origins"
          className="mt-5 inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Manage Shipping Origins
        </Link>
      </section>
    </AdminShell>
  );
}
