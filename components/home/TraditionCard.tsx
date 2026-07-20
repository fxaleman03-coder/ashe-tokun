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
    <Link
      href={href}
      className="group block focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 focus:ring-offset-2 focus:ring-offset-[#0f0b07]"
    >
      <article className="relative min-h-[28rem] overflow-hidden rounded-[1.4rem] border border-[#d8a344]/24 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.24)] transition duration-700 ease-out group-hover:-translate-y-1 group-hover:border-[#d8a344]/68 group-hover:shadow-[0_30px_90px_rgba(0,0,0,0.36),0_0_42px_rgba(216,163,68,0.12)]">
        <div className="absolute inset-0 z-0">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(min-width: 1280px) 50vw, (min-width: 768px) 50vw, 100vw"
            quality={82}
            className="object-cover brightness-[1.08] contrast-[1.05] saturate-[1.03] transition duration-1000 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0b07]/14 via-[#0f0b07]/48 to-[#050302]/82" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,11,7,0.1)_0%,rgba(15,11,7,0.26)_45%,rgba(15,11,7,0.62)_100%)] transition duration-700 ease-out group-hover:bg-[#0f0b07]/8" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050302]/92 via-[#0f0b07]/62 to-transparent" />
        </div>

        <div className="relative z-10 flex min-h-[28rem] flex-col justify-end p-7 sm:p-8">
          <div className="max-w-md">
            <h3 className="font-serif text-3xl font-semibold text-[#f7ead2] drop-shadow-[0_3px_18px_rgba(0,0,0,0.6)]">
              {title}
            </h3>
            <p className="mt-4 text-base leading-7 text-[#f7ead2]/82 drop-shadow-[0_2px_14px_rgba(0,0,0,0.58)]">
              {description}
            </p>
            <span className="mt-7 inline-flex min-h-11 items-center justify-center border border-[#d8a344]/55 px-5 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#d8a344] opacity-100 shadow-[0_0_0_rgba(216,163,68,0)] transition duration-700 ease-out group-hover:bg-[#d8a344] group-hover:text-[#0f0b07] group-hover:shadow-[0_0_34px_rgba(216,163,68,0.2)] sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
              {buttonLabel}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
