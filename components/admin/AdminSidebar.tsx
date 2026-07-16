"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { hasPermission } from "@/lib/staff/permissionHelpers";
import type { Translation } from "@/lib/translations";
import type { PermissionKey } from "@/lib/staff/permissionTypes";

type AdminNavigation = Translation["admin"]["navigation"];
type NavigationLabelKey = keyof AdminNavigation;

type NavigationLink = {
  href: string;
  labelKey: NavigationLabelKey;
  permissions: PermissionKey[];
};

type NavigationGroup = {
  titleKey: NavigationLabelKey;
  links: NavigationLink[];
};

const navigationGroups: NavigationGroup[] = [
  {
    titleKey: "dashboardGroup",
    links: [{ href: "/admin", labelKey: "dashboard", permissions: ["reports.sales"] }],
  },
  {
    titleKey: "catalogGroup",
    links: [
      { href: "/admin/catalog", labelKey: "catalogOverview", permissions: ["products.read"] },
      { href: "/admin/products", labelKey: "products", permissions: ["products.read"] },
      { href: "/admin/vendors", labelKey: "vendors", permissions: ["vendors.read"] },
      { href: "/admin/collections", labelKey: "collections", permissions: ["products.read"] },
      { href: "/admin/categories", labelKey: "categories", permissions: ["products.read"] },
      { href: "/admin/product-types", labelKey: "productTypes", permissions: ["products.read"] },
      { href: "/admin/traditions", labelKey: "traditions", permissions: ["products.read"] },
      { href: "/admin/media", labelKey: "mediaLibrary", permissions: ["products.read"] },
    ],
  },
  {
    titleKey: "commerceGroup",
    links: [
      { href: "/admin/pos", labelKey: "pos", permissions: ["pos.access"] },
      { href: "/admin/inventory", labelKey: "inventory", permissions: ["inventory.read"] },
      { href: "/admin/orders", labelKey: "orders", permissions: ["orders.read"] },
      { href: "/admin/shipping", labelKey: "shipping", permissions: ["shipping.read"] },
      { href: "/admin/returns", labelKey: "returns", permissions: ["returns.read"] },
      { href: "/admin/customers", labelKey: "customers", permissions: ["customers.read"] },
      { href: "/admin/analytics", labelKey: "analytics", permissions: ["reports.sales"] },
    ],
  },
  {
    titleKey: "settingsGroup",
    links: [
      { href: "/admin/settings", labelKey: "settings", permissions: ["settings.company"] },
      { href: "/admin/database", labelKey: "database", permissions: ["settings.security"] },
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

export default function AdminSidebar({
  permissions,
}: {
  permissions: PermissionKey[];
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const visibleNavigationGroups = navigationGroups
    .map((group) => ({
      title: t.admin.navigation[group.titleKey],
      links: group.links.filter((link) =>
        hasPermission(permissions, link.permissions),
      ).map((link) => ({
        ...link,
        label: t.admin.navigation[link.labelKey],
      })),
    }))
    .filter((group) => group.links.length > 0);
  const activeHref = getActiveHref(pathname);

  return (
    <aside className="border-b border-[#f7ead2]/10 bg-[#0f0b07] px-6 py-6 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
      <Link href="/admin" className="block">
        <p className="font-serif text-xl font-semibold tracking-[0.24em] text-[#f7ead2]">
          ASHE TOKUN
        </p>
        <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#d8a344]">
          {t.admin.controlCenter}
        </p>
      </Link>

      <nav className="mt-8 flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
        {visibleNavigationGroups.map((group) => (
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
          {t.admin.launchStatus.label}
        </p>
        <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/58">
          {t.admin.launchStatus.description}
        </p>
      </div>
    </aside>
  );
}
