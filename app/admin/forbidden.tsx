import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <main className="min-h-screen bg-[#0f0b07] px-6 py-16 text-[#f7ead2]">
      <section className="mx-auto max-w-2xl border border-[#d8a344]/25 bg-[#120d08] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
          403
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold">
          Access Denied
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#e8dcc8]/68">
          Your current staff permissions do not allow access to this ASHE TOKUN
          admin section. Contact an Owner or authorized Manager if your access
          needs to change.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/staff"
            className="inline-flex min-h-11 items-center justify-center bg-[#d8a344] px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition hover:bg-[#f0c062]"
          >
            Staff Command Center
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07]"
          >
            Admin Home
          </Link>
        </div>
      </section>
    </main>
  );
}
