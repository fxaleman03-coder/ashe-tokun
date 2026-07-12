"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  activateShippingOrigin,
  deactivateShippingOrigin,
  setDefaultShippingOrigin,
} from "@/lib/data/shippingOriginMutations";
import type { ShippingOrigin } from "@/lib/types/shippingOrigin";

type ShippingOriginsManagerProps = {
  origins: ShippingOrigin[];
};

function statusLabel(origin: ShippingOrigin) {
  if (!origin.active) return "Inactive";
  return origin.is_complete ? "Active" : "Incomplete";
}

export default function ShippingOriginsManager({
  origins,
}: ShippingOriginsManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function runAction(
    originId: string,
    action: () => Promise<{ ok: boolean; message?: string; error?: string }>,
  ) {
    setWorkingId(originId);
    const result = await action();
    setWorkingId(null);
    setMessage(result.ok ? result.message ?? "Updated." : result.error ?? "Action failed.");

    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/settings/shipping-origins/new"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          New Shipping Origin
        </Link>
        <p className="text-sm text-[#e8dcc8]/54">
          Shipment snapshots remain unchanged when origins are edited later.
        </p>
      </div>

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[1120px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">City / State</th>
              <th className="px-5 py-4">Active</th>
              <th className="px-5 py-4">Complete</th>
              <th className="px-5 py-4">Default</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {origins.map((origin) => (
              <tr
                key={origin.id}
                className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
              >
                <td className="px-5 py-4 font-medium text-[#f7ead2]">
                  {origin.name}
                </td>
                <td className="px-5 py-4">{origin.code}</td>
                <td className="px-5 py-4">{origin.company_name}</td>
                <td className="px-5 py-4">{origin.contact_name ?? "Pending"}</td>
                <td className="px-5 py-4">
                  {[origin.city, origin.state].filter(Boolean).join(", ") ||
                    "Pending"}
                </td>
                <td className="px-5 py-4">{origin.active ? "Yes" : "No"}</td>
                <td className="px-5 py-4">
                  {origin.is_complete ? "Complete" : "Incomplete"}
                </td>
                <td className="px-5 py-4">{origin.is_default ? "Default" : "-"}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/settings/shipping-origins/${origin.id}`}
                      className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                    >
                      View / Edit
                    </Link>
                    {!origin.is_default ? (
                      <button
                        type="button"
                        onClick={() =>
                          runAction(origin.id, () =>
                            setDefaultShippingOrigin(origin.id),
                          )
                        }
                        disabled={workingId === origin.id}
                        className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:text-[#e8dcc8]/32"
                      >
                        Set Default
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        runAction(origin.id, () =>
                          origin.active
                            ? deactivateShippingOrigin(origin.id)
                            : activateShippingOrigin(origin.id),
                        )
                      }
                      disabled={workingId === origin.id}
                      className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:text-[#e8dcc8]/32"
                    >
                      {origin.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-sm text-[#e8dcc8]/54">
        Origin readiness:{" "}
        {origins.map((origin) => `${origin.name} is ${statusLabel(origin)}`).join("; ")}
      </p>
    </div>
  );
}
