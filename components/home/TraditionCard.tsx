import Image from "next/image";
import Link from "next/link";

type TraditionCardProps = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  buttonLabel: string;
  href: string;
};

export default function TraditionCard({
  title,
  description,
  imageSrc,
  imageAlt,
  buttonLabel,
  href,
}: TraditionCardProps) {
  return (
    <article className="group relative min-h-[28rem] overflow-hidden border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.24)] transition duration-700 ease-out hover:-translate-y-1 hover:border-[#d8a344]/60 hover:shadow-[0_30px_90px_rgba(0,0,0,0.36),0_0_42px_rgba(216,163,68,0.12)]">
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover opacity-78 transition duration-1000 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0b07] via-[#0f0b07]/72 to-[#0f0b07]/18" />
        <div className="absolute inset-0 bg-[#0f0b07]/18 transition duration-700 ease-out group-hover:bg-[#0f0b07]/8" />
      </div>

      <div className="relative z-10 flex min-h-[28rem] flex-col justify-end p-7 sm:p-8">
        <div className="max-w-md">
          <h3 className="font-serif text-3xl font-semibold text-[#f7ead2]">
            {title}
          </h3>
          <p className="mt-4 text-base leading-7 text-[#e8dcc8]/72">
            {description}
          </p>
          <Link
            href={href}
            className="mt-7 inline-flex min-h-11 items-center justify-center border border-[#d8a344]/55 px-5 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#d8a344] opacity-100 shadow-[0_0_0_rgba(216,163,68,0)] transition duration-700 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07] hover:shadow-[0_0_34px_rgba(216,163,68,0.2)] sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          >
            {buttonLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
