import Link from "next/link";
import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

type ManagementCardProps = {
  title: string;
  description: string;
  meta?: string;
  status?: string;
  action?: string;
};

type TableColumn<Row> = {
  label: string;
  render: (row: Row) => ReactNode;
};

export function CatalogStatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-500 ease-out hover:border-[#d8a344]/45 hover:shadow-[0_28px_84px_rgba(0,0,0,0.3),0_0_34px_rgba(216,163,68,0.1)]">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
        {label}
      </p>
      <p className="mt-4 font-serif text-4xl font-semibold text-[#f7ead2]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/60">{detail}</p>
    </article>
  );
}

export function ManagementCard({
  title,
  description,
  meta,
  status = "Active",
  action = "View",
}: ManagementCardProps) {
  return (
    <article className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-500 ease-out hover:-translate-y-1 hover:border-[#d8a344]/45 hover:shadow-[0_28px_84px_rgba(0,0,0,0.3),0_0_34px_rgba(216,163,68,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
          {title}
        </p>
        <span className="border border-[#d8a344]/25 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#e8dcc8]/68">
          {status}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#e8dcc8]/64">
        {description}
      </p>
      {meta ? (
        <p className="mt-5 text-xs uppercase tracking-[0.18em] text-[#e8dcc8]/42">
          {meta}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-6 inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
      >
        {action}
      </button>
    </article>
  );
}

export function ManagementTable<Row extends { id: string }>({
  rows,
  columns,
}: {
  rows: Row[];
  columns: TableColumn<Row>[];
}) {
  return (
    <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
            {columns.map((column) => (
              <th key={column.label} className="px-5 py-4">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
            >
              {columns.map((column) => (
                <td key={column.label} className="px-5 py-4">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlaceholderPage({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <section className="max-w-3xl border border-[#f7ead2]/10 bg-[#120d08] p-8 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
        Visual Only
      </p>
      <h2 className="mt-4 font-serif text-3xl font-semibold text-[#f7ead2]">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-6 text-[#e8dcc8]/64">
        {description}
      </p>
      <Link
        href={href}
        className="mt-7 inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
      >
        Back to Catalog
      </Link>
    </section>
  );
}
