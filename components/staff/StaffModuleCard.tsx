"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type {
  StaffMetricLine,
  StaffModuleMetric,
} from "@/lib/staff/staffMetrics";
import type { StaffModuleId } from "@/lib/staff/staffPermissions";

type StaffModuleCardProps = {
  id: StaffModuleId;
  href: string;
  metric: StaffModuleMetric;
  marker: string;
};

export default function StaffModuleCard({
  id,
  href,
  metric,
  marker,
}: StaffModuleCardProps) {
  const { t } = useLanguage();
  const moduleCopy = t.staff.modules[id];
  const statusLabel = t.staff.metricStatuses[metric.status];

  function renderMetricLine(line: StaffMetricLine | { value: string }) {
    if ("label" in line) {
      const label = t.staff.metricLabels[line.label];

      return line.value === undefined ? label : `${line.value} ${label}`;
    }

    return line.value;
  }

  return (
    <Link
      href={href}
      aria-label={`${t.staff.openModule}: ${moduleCopy.name}`}
      className="group flex min-h-64 flex-col justify-between border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition duration-500 ease-out hover:border-[#d8a344]/55 hover:bg-[#171008] hover:shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_42px_rgba(216,163,68,0.12)] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center border border-[#d8a344]/30 bg-[#0f0b07] font-serif text-lg font-semibold text-[#d8a344] shadow-[0_0_28px_rgba(216,163,68,0.08)] transition duration-500 group-hover:border-[#d8a344]/70 group-hover:text-[#f7ead2]"
          >
            {marker}
          </span>
          <span className="border border-[#f7ead2]/10 bg-[#0f0b07]/80 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
            {statusLabel}
          </span>
        </div>
        <h2 className="mt-6 font-serif text-3xl font-semibold text-[#f7ead2]">
          {moduleCopy.name}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
          {moduleCopy.description}
        </p>
      </div>

      <div className="mt-8 border-t border-[#f7ead2]/10 pt-5">
        <p className="text-base font-semibold text-[#f7ead2]">
          {renderMetricLine(metric.primary)}
        </p>
        <p className="mt-2 text-sm text-[#e8dcc8]/55">
          {renderMetricLine(metric.secondary)}
        </p>
        <span className="mt-5 inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-300 group-hover:bg-[#d8a344] group-hover:text-[#0f0b07]">
          {t.staff.openModule}
        </span>
      </div>
    </Link>
  );
}
