type AdminStatCardProps = {
  label: string;
  value: string;
  detail: string;
  marker?: string;
};

export default function AdminStatCard({
  label,
  value,
  detail,
  marker,
}: AdminStatCardProps) {
  return (
    <article className="border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-500 ease-out hover:border-[#d8a344]/45 hover:shadow-[0_28px_84px_rgba(0,0,0,0.3),0_0_34px_rgba(216,163,68,0.1)]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
          {label}
        </p>
        {marker ? (
          <span className="flex h-9 w-9 items-center justify-center border border-[#d8a344]/25 bg-[#0f0b07] font-serif text-sm text-[#d8a344]">
            {marker}
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-serif text-4xl font-semibold text-[#f7ead2]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/60">{detail}</p>
    </article>
  );
}
