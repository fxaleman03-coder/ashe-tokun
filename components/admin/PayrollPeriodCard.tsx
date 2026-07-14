import Link from "next/link";
import type { PayrollPeriod } from "@/lib/types/payroll";
import { formatDate } from "@/lib/utils/dateTimeDisplay";

type PayrollPeriodCardProps = {
  period: PayrollPeriod;
};

export default function PayrollPeriodCard({ period }: PayrollPeriodCardProps) {
  return (
    <section className="border border-[#d8a344]/25 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
        Current Pay Period
      </p>
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="font-serif text-3xl font-semibold text-[#f7ead2]">
          {period.period_name}
        </h2>
        {period.id ? (
          <Link
            href={`/admin/payroll/${period.id}`}
            className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/35 px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
          >
            Current Period
          </Link>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 text-sm text-[#e8dcc8]/70 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]/72">
            Type
          </p>
          <p className="mt-1 capitalize">{period.period_type.replaceAll("_", "-")}</p>
        </div>
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]/72">
            Dates
          </p>
          <p className="mt-1">
            {formatDate(period.start_date)} - {formatDate(period.end_date)}
          </p>
        </div>
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]/72">
            Status
          </p>
          <p className="mt-1 capitalize">{period.status}</p>
        </div>
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]/72">
            Pay Date
          </p>
          <p className="mt-1">{formatDate(period.pay_date)}</p>
        </div>
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]/72">
            Location
          </p>
          <p className="mt-1">{period.location_name ?? "All locations"}</p>
        </div>
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]/72">
            Architecture
          </p>
          <p className="mt-1">Weekly / bi-weekly / semi-monthly / monthly</p>
        </div>
      </div>
      {!period.id ? (
        <p className="mt-4 border border-[#d8a344]/30 bg-[#0f0b07] p-3 text-sm text-[#d8a344]/82">
          Payroll actions require a real persisted payroll period UUID. Run the payroll
          period migration and create/select a payroll period before generating payroll
          or exporting files.
        </p>
      ) : null}
    </section>
  );
}
