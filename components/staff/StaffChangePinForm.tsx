"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLanguage } from "@/components/LanguageProvider";
import {
  changePinAction,
  type StaffActionState,
} from "@/lib/staff/staffActions";

const initialState: StaffActionState = {
  message: "",
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useLanguage();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344] transition duration-300 hover:bg-[#d8a344] hover:text-[#0f0b07] focus:outline-none focus:ring-2 focus:ring-[#d8a344]/70 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? t.staff.login.signingIn : t.staff.security.changePin}
    </button>
  );
}

export default function StaffChangePinForm() {
  const { t } = useLanguage();
  const [state, formAction] = useActionState(changePinAction, initialState);

  return (
    <section className="w-full max-w-xl border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.34)] sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d8a344]">
        {t.staff.security.mustChangePin}
      </p>
      <h1 className="mt-5 font-serif text-4xl font-semibold">
        {t.staff.security.changePin}
      </h1>
      <p className="mt-3 text-sm leading-7 text-[#e8dcc8]/62">
        {t.staff.security.changePinHelp}
      </p>

      <form className="mt-8 space-y-5" action={formAction}>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {t.staff.security.currentPin}
          </span>
          <input
            name="currentPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="current-password"
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/12 bg-[#0f0b07] px-4 text-base text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70 focus:ring-2 focus:ring-[#d8a344]/30"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {t.staff.security.newPin}
          </span>
          <input
            name="newPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/12 bg-[#0f0b07] px-4 text-base text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70 focus:ring-2 focus:ring-[#d8a344]/30"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344]">
            {t.staff.security.confirmNewPin}
          </span>
          <input
            name="confirmPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            className="mt-3 min-h-12 w-full border border-[#f7ead2]/12 bg-[#0f0b07] px-4 text-base text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70 focus:ring-2 focus:ring-[#d8a344]/30"
          />
        </label>

        {state.message ? (
          <p className="border border-[#d8a344]/25 bg-[#0f0b07] p-3 text-sm leading-6 text-[#e8dcc8]/72">
            {state.message}
          </p>
        ) : null}

        <SubmitButton />
      </form>
    </section>
  );
}
