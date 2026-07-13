"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLanguage } from "@/components/LanguageProvider";
import {
  loginStaffAction,
  type StaffActionState,
} from "@/lib/staff/staffActions";

const initialState: StaffActionState = {
  message: "",
  status: "idle",
};

function SignInButton() {
  const { pending } = useFormStatus();
  const { t } = useLanguage();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344] transition duration-300 hover:bg-[#d8a344] hover:text-[#0f0b07] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? t.staff.login.signingIn : t.staff.login.signIn}
    </button>
  );
}

export default function StaffLoginForm() {
  const { t } = useLanguage();
  const [state, formAction] = useActionState(loginStaffAction, initialState);

  return (
    <section className="w-full max-w-xl border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.34)] sm:p-8">
      <Link
        href="/staff"
        className="text-xs font-bold uppercase tracking-[0.28em] text-[#d8a344] transition hover:text-[#f7ead2] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/60"
      >
        {t.staff.commandCenterLink}
      </Link>
      <h1 className="mt-5 font-serif text-4xl font-semibold">
        {t.staff.login.title}
      </h1>
      <p className="mt-3 text-sm leading-7 text-[#e8dcc8]/62">
        {t.staff.login.subtitle}
      </p>

      <form className="mt-8 space-y-5" action={formAction}>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {t.staff.login.employeeNumber}
          </span>
          <input
            name="employeeNumber"
            autoComplete="username"
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/12 bg-[#0f0b07] px-4 text-base text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70 focus:ring-2 focus:ring-[#d8a344]/30"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {t.staff.login.pin}
          </span>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="current-password"
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/12 bg-[#0f0b07] px-4 text-base text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70 focus:ring-2 focus:ring-[#d8a344]/30"
          />
        </label>

        {state.message ? (
          <p className="border border-[#d8a344]/25 bg-[#0f0b07] p-3 text-sm leading-6 text-[#e8dcc8]/72">
            {state.message}
          </p>
        ) : null}

        <SignInButton />
      </form>

      <p className="mt-6 text-center text-sm text-[#e8dcc8]/55">
        {t.staff.login.accessHelp}
      </p>
    </section>
  );
}
