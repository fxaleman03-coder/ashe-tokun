import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/products", label: "Collections" },
  { href: "/admin/products", label: "Categories" },
  { href: "/admin/media", label: "Media Library" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/orders", label: "Customers" },
  { href: "/admin", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminSidebar() {
  return (
    <aside className="border-b border-[#f7ead2]/10 bg-[#0f0b07] px-6 py-6 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
      <Link href="/admin" className="block">
        <p className="font-serif text-xl font-semibold tracking-[0.24em] text-[#f7ead2]">
          ASHE TOKUN
        </p>
        <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
          Admin
        </p>
      </Link>

      <nav className="mt-8 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {adminLinks.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="whitespace-nowrap border border-[#f7ead2]/10 px-4 py-3 text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/68 transition duration-500 ease-out hover:border-[#d8a344]/60 hover:text-[#d8a344] hover:shadow-[0_0_28px_rgba(216,163,68,0.1)]"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-10 hidden border border-[#d8a344]/20 bg-[#120d08] p-5 lg:block">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
          UI Foundation
        </p>
        <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/58">
          Authentication and database access are intentionally not connected yet.
        </p>
      </div>
    </aside>
  );
}
