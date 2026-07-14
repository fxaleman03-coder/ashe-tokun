"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PayrollActionButtonProps = {
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  variant?: "gold" | "quiet" | "danger";
  action: () => Promise<{ success?: boolean; ok?: boolean; error?: string }>;
};

const variantClasses = {
  gold:
    "border-[#d8a344]/45 text-[#d8a344] hover:bg-[#d8a344] hover:text-[#0f0b07]",
  quiet:
    "border-[#f7ead2]/12 text-[#e8dcc8]/70 hover:border-[#d8a344]/50 hover:text-[#d8a344]",
  danger:
    "border-red-300/35 text-red-200/80 hover:border-red-200/70 hover:text-red-100",
};

export default function PayrollActionButton({
  label,
  pendingLabel,
  disabled = false,
  disabledReason,
  variant = "quiet",
  action,
}: PayrollActionButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          setMessage(pendingLabel ?? `${label}...`);
          startTransition(async () => {
            const result = await action();
            const ok = result.success ?? result.ok ?? false;
            setMessage(ok ? `${label} complete.` : result.error ?? `${label} failed.`);
            if (ok) router.refresh();
          });
        }}
        className={`min-h-11 border px-4 text-xs font-bold uppercase tracking-[0.16em] transition disabled:pointer-events-none disabled:opacity-40 ${variantClasses[variant]}`}
      >
        {pending ? pendingLabel ?? "Working..." : label}
      </button>
      {disabled && disabledReason ? (
        <p className="max-w-xs text-xs text-[#d8a344]/72">{disabledReason}</p>
      ) : null}
      {message ? <p className="max-w-xs text-xs text-[#e8dcc8]/58">{message}</p> : null}
    </div>
  );
}
