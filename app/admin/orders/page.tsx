import AdminShell from "@/components/admin/AdminShell";

export default function AdminOrdersPage() {
  return (
    <AdminShell
      title="Orders"
      description="Orders will appear here after checkout and backend services are connected."
    >
      <section className="border border-[#f7ead2]/10 bg-[#120d08] px-8 py-16 text-center shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#d8a344]">
          Orders
        </p>
        <h2 className="mt-4 font-serif text-4xl font-semibold text-[#f7ead2]">
          No orders yet
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#e8dcc8]/64">
          This is a visual empty state. Real order data will be introduced with
          the ecommerce backend.
        </p>
      </section>
    </AdminShell>
  );
}
