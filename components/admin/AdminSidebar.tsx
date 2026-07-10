"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationGroups = [
  {
    title: "Dashboard",
    links: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    title: "Catalog",
    links: [
      { href: "/admin/catalog", label: "Catalog Overview" },
      { href: "/admin/products", label: "Products" },
      { href: "/admin/vendors", label: "Vendors" },
      { href: "/admin/collections", label: "Collections" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/product-types", label: "Product Types" },
      { href: "/admin/traditions", label: "Traditions" },
      { href: "/admin/media", label: "Media Library" },
    ],
  },
  {
    title: "Commerce",
    links: [
      { href: "/admin/pos", label: "POS" },
      { href: "/admin/inventory", label: "Inventory" },
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    title: "Settings",
    links: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/database", label: "Database" },
    ],
  },
];

const allNavigationLinks = navigationGroups.flatMap((group) => group.links);

function getActiveHref(pathname: string) {
  return allNavigationLinks
    .filter(
      (link) =>
        pathname === link.href || pathname.startsWith(`${link.href}/`),
    )
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  return (
    <aside className="border-b border-[#f7ead2]/10 bg-[#0f0b07] px-6 py-6 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
      <Link href="/admin" className="block">
        <p className="font-serif text-xl font-semibold tracking-[0.24em] text-[#f7ead2]">
          ASHE TOKUN
        </p>
        <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
          Control Center
        </p>
      </Link>

      <nav className="mt-8 flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
        {navigationGroups.map((group) => (
          <div key={group.title} className="min-w-max lg:min-w-0">
            <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]/72">
              {group.title}
            </p>
            <div className="flex gap-2 lg:flex-col">
              {group.links.map((link) => {
                const isActive = link.href === activeHref;

                return (
                  <Link
                    key={`${group.title}-${link.label}-${link.href}`}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "whitespace-nowrap border px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] transition duration-500 ease-out hover:border-[#d8a344]/60 hover:text-[#d8a344] hover:shadow-[0_0_28px_rgba(216,163,68,0.1)]",
                      isActive
                        ? "border-[#d8a344]/70 bg-[#1a1209] text-[#d8a344] shadow-[inset_3px_0_0_rgba(216,163,68,0.9),0_0_28px_rgba(216,163,68,0.14)]"
                        : "border-[#f7ead2]/10 text-[#e8dcc8]/68",
                    ].join(" ")}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
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
