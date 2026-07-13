"use client";

import StaffModuleCard from "@/components/staff/StaffModuleCard";
import StaffPortalHeader from "@/components/staff/StaffPortalHeader";
import { useLanguage } from "@/components/LanguageProvider";
import type { StaffModuleMetric } from "@/lib/staff/staffMetrics";
import type {
  StaffModuleDefinition,
  StaffModuleId,
} from "@/lib/staff/staffPermissions";
import type { StaffSession } from "@/lib/staff/staffSession";

type StaffCommandCenterProps = {
  session: StaffSession;
  modules: StaffModuleDefinition[];
  metrics: Record<StaffModuleId, StaffModuleMetric>;
};

const moduleMarkers: Record<StaffModuleId, string> = {
  pos: "$",
  orders: "O",
  customers: "C",
  inventory: "I",
  shipping: "S",
  returns: "R",
  scheduling: "SC",
  my_schedule: "MS",
  availability: "A",
  time_off: "TO",
  products: "P",
  receiving: "RC",
  reports: "↗",
  staff_settings: "SS",
};

export default function StaffCommandCenter({
  session,
  modules,
  metrics,
}: StaffCommandCenterProps) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#0f0b07] text-[#f7ead2]">
      <StaffPortalHeader session={session} />
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <section className="mb-8 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d8a344]">
            {t.staff.commandCenter}
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="font-serif text-4xl font-semibold text-[#f7ead2]">
                {t.staff.operations}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#e8dcc8]/62">
                {t.staff.developmentSessionNotice}
              </p>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#e8dcc8]/55">
              {t.staff.routeProtectionNotice}
            </p>
          </div>
        </section>

        <section
          aria-label={t.staff.commandCenter}
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {modules.map((moduleDefinition) => (
            <StaffModuleCard
              key={moduleDefinition.id}
              id={moduleDefinition.id}
              href={moduleDefinition.href}
              metric={metrics[moduleDefinition.id]}
              marker={moduleMarkers[moduleDefinition.id]}
            />
          ))}
        </section>

        <p className="mt-8 border border-[#f7ead2]/10 bg-[#120d08] p-4 text-sm leading-6 text-[#e8dcc8]/58">
          {t.staff.moduleNavigationNotice}
        </p>
      </main>
    </div>
  );
}
