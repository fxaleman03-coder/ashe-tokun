import AdminShell from "@/components/admin/AdminShell";

const settings = [
  ["Store Name", "ASHE TOKUN"],
  ["Store Mode", "Catalog foundation"],
  ["Primary Currency", "USD"],
  ["Fulfillment", "Manual setup pending"],
];

export default function AdminSettingsPage() {
  return (
    <AdminShell
      title="Settings"
      description="Visual placeholders for future store configuration."
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
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
