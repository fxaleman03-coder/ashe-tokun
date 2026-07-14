"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function titleCase(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDynamicLabel(
  previousSegment: string | undefined,
  labels: Record<string, string>,
) {
  switch (previousSegment) {
    case "payroll":
      return labels.payrollPeriod;
    case "employees":
      return labels.employeeDetail;
    case "timekeeper":
      return labels.timecardDetail;
    case "staff":
      return labels.employeeProfile;
    case "scheduling":
      return labels.workingWeek;
    default:
      return labels.detail;
  }
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const labels = t.staff.global;
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const previousSegment = segments[index - 1];
    const isDynamic = uuidPattern.test(segment) || segment.length > 26;
    const staticLabels: Record<string, string> = {
      admin: labels.admin,
      staff: labels.staff,
      dashboard: labels.dashboard,
      payroll: labels.payroll,
      timekeeper: labels.timekeeper,
      scheduling: labels.scheduling,
      products: labels.products,
      inventory: labels.inventory,
      orders: labels.orders,
      customers: labels.customers,
      shipping: labels.shipping,
      returns: labels.returns,
      settings: labels.settings,
      database: labels.database,
      new: labels.new,
      edit: labels.edit,
      employees: labels.employees,
      availability: labels.availability,
      "time-off": labels.timeOff,
    };

    return {
      href,
      label: isDynamic
        ? getDynamicLabel(previousSegment, labels)
        : staticLabels[segment] ?? titleCase(segment),
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]">
      <ol className="flex flex-wrap items-center gap-2 text-[#e8dcc8]/52">
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;

          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {isCurrent ? (
                <span className="text-[#f7ead2]">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="transition duration-300 hover:text-[#d8a344] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/60 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
