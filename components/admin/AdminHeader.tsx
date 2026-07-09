type AdminHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function AdminHeader({
  eyebrow = "Control Center",
  title,
  description,
}: AdminHeaderProps) {
  return (
    <header className="border-b border-[#f7ead2]/10 bg-[#0f0b07]/86 px-6 py-8 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-8 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#d8a344]">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-[#f7ead2]">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#e8dcc8]/66">
          {description}
        </p>
      ) : null}
    </header>
  );
}
